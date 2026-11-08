import { bytesToBase64Url, randomBytes } from "../crypto/bytes"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import type { CommandBusStabilizer } from "../stabilizers/command-bus"
import type { CommandQueueStabilizer } from "../stabilizers/command-queue"
import type { PeerHostStabilizer } from "../stabilizers/peer-host"
import type {
  SyncBusCommand,
  SyncConnectionState,
  SyncDeviceId,
  SyncRemoteSearchHit,
  SyncRemoteTabRow,
  SyncTabsOp
} from "../types"
import { applyRemoteOpenTabs } from "../bus/remote-open"
import { applyRemoteTabsList } from "../bus/apply-remote-tabs-list"
import { applyRemoteSearchQuery } from "../bus/apply-remote-search-query"
import { applyRemoteTabsOps } from "../bus/apply-remote-tabs-ops.ts"
import { SYNC_REMOTE_QUERY_TIMEOUT_MS } from "../bus/remote-query-limits"
import { getRunLocale } from "../../setting/i18n/run-locale"

function mapPeerState(raw: string): SyncConnectionState {
  if (raw === "connected") {
    return "connected"
  }
  if (raw === "connecting" || raw === "checking") {
    return "signaling"
  }
  // EN: Transient "disconnected" still holds the PC — surface as signaling so UI does not
  //     treat the tunnel as gone until failed/closed (explicit reconnect replaces the session).
  // JA: 一時的な disconnected でも PC は保持。failed/closed までトンネル消失扱いしない。
  if (raw === "disconnected") {
    return "signaling"
  }
  if (raw === "failed" || raw === "closed") {
    return "disconnected"
  }
  return "idle"
}

type PendingOpen = {
  kind: "open"
  at: number
  resolve: (value: { ok: boolean; detail: string | null; rttMs: number | null }) => void
}

type PendingAck = {
  kind: "ack"
  at: number
  resolve: (value: { ok: boolean; detail: string | null; rttMs: number | null }) => void
}

type PendingTabsList = {
  kind: "tabs_list"
  at: number
  resolve: (value: {
    ok: boolean
    detail: string | null
    rows: SyncRemoteTabRow[]
    rttMs: number | null
  }) => void
}

type PendingSearch = {
  kind: "search_query"
  at: number
  resolve: (value: {
    ok: boolean
    detail: string | null
    hits: SyncRemoteSearchHit[]
    rttMs: number | null
  }) => void
}

type PendingTabsOps = {
  kind: "tabs_ops"
  at: number
  resolve: (value: { ok: boolean; detail: string | null; rttMs: number | null }) => void
}

type PendingWaiter =
  | PendingOpen
  | PendingAck
  | PendingTabsList
  | PendingSearch
  | PendingTabsOps

export function createWebrtcCommandBusStabilizer(
  peerHost: PeerHostStabilizer,
  commandQueue: CommandQueueStabilizer
): CommandBusStabilizer {
  const states = new Map<SyncDeviceId, SyncConnectionState>()
  const stateListeners = new Set<() => void>()
  let commandHandler: ((command: SyncBusCommand) => void | Promise<void>) | null = null
  const pending = new Map<string, PendingWaiter>()

  function notifyStates(): void {
    for (const listener of stateListeners) {
      listener()
    }
  }

  function setMappedState(remoteDeviceId: SyncDeviceId, mapped: SyncConnectionState): void {
    const prev = states.get(remoteDeviceId)
    states.set(remoteDeviceId, mapped)
    if (prev !== mapped) {
      notifyStates()
    }
  }

  async function replyTo(
    remoteDeviceId: SyncDeviceId,
    command: SyncBusCommand
  ): Promise<void> {
    const sent = await peerHost.sendCommand(remoteDeviceId, command)
    if (!sent) {
      await commandQueue.enqueue(remoteDeviceId, command)
    }
  }

  async function handleIncoming(command: SyncBusCommand): Promise<void> {
    if (command.type === "ack") {
      const waiter = pending.get(command.replyTo)
      if (waiter && waiter.kind === "ack") {
        pending.delete(command.replyTo)
        waiter.resolve({
          ok: true,
          detail: null,
          rttMs: Math.max(0, Date.now() - waiter.at)
        })
      }
    } else if (command.type === "ping") {
      const device = await loadOrCreateDeviceIdentity()
      const ack: SyncBusCommand = {
        type: "ack",
        id: bytesToBase64Url(randomBytes(8)),
        replyTo: command.id,
        from: device.deviceId,
        at: Date.now()
      }
      await replyTo(command.from, ack)
    } else if (command.type === "open_tabs") {
      const result = await applyRemoteOpenTabs({
        urls: command.urls,
        groupTitle: command.groupTitle,
        locale: getRunLocale()
      })
      const device = await loadOrCreateDeviceIdentity()
      const reply: SyncBusCommand = {
        type: "open_tabs_result",
        id: bytesToBase64Url(randomBytes(8)),
        replyTo: command.id,
        from: device.deviceId,
        ok: result.ok,
        detail: result.detail
      }
      await replyTo(command.from, reply)
    } else if (command.type === "open_tabs_result") {
      const waiter = pending.get(command.replyTo)
      if (waiter && waiter.kind === "open") {
        pending.delete(command.replyTo)
        waiter.resolve({
          ok: command.ok,
          detail: command.detail,
          rttMs: Math.max(0, Date.now() - waiter.at)
        })
      }
    } else if (command.type === "tabs_list") {
      const result = await applyRemoteTabsList({ locale: getRunLocale() })
      const device = await loadOrCreateDeviceIdentity()
      let rows = result.rows
      // EN: Defense — if serialized reply would exceed the DataChannel receive cap, drop favicons.
      // JA: 防御。シリアライズ結果が DataChannel 受信上限を超えそうなら favicon を落とす。
      const probe: SyncBusCommand = {
        type: "tabs_list_result",
        id: "probe",
        replyTo: command.id,
        from: device.deviceId,
        ok: result.ok,
        detail: result.detail,
        rows
      }
      if (JSON.stringify(probe).length > 180_000) {
        rows = rows.map((row) => {
          if (row.kind !== "tab") {
            return row
          }
          return { ...row, favIconUrl: null }
        })
      }
      const reply: SyncBusCommand = {
        type: "tabs_list_result",
        id: bytesToBase64Url(randomBytes(8)),
        replyTo: command.id,
        from: device.deviceId,
        ok: result.ok,
        detail: result.detail,
        rows
      }
      await replyTo(command.from, reply)
    } else if (command.type === "tabs_list_result") {
      const waiter = pending.get(command.replyTo)
      if (waiter && waiter.kind === "tabs_list") {
        pending.delete(command.replyTo)
        waiter.resolve({
          ok: command.ok,
          detail: command.detail,
          rows: command.rows,
          rttMs: Math.max(0, Date.now() - waiter.at)
        })
      }
    } else if (command.type === "search_query") {
      const result = await applyRemoteSearchQuery({
        dispatchLine: command.dispatchLine,
        locale: getRunLocale()
      })
      const device = await loadOrCreateDeviceIdentity()
      const reply: SyncBusCommand = {
        type: "search_query_result",
        id: bytesToBase64Url(randomBytes(8)),
        replyTo: command.id,
        from: device.deviceId,
        ok: result.ok,
        detail: result.detail,
        hits: result.hits
      }
      await replyTo(command.from, reply)
    } else if (command.type === "tabs_ops") {
      const result = await applyRemoteTabsOps(command.op)
      const device = await loadOrCreateDeviceIdentity()
      const reply: SyncBusCommand = {
        type: "tabs_ops_result",
        id: bytesToBase64Url(randomBytes(8)),
        replyTo: command.id,
        from: device.deviceId,
        ok: result.ok,
        detail: result.detail
      }
      await replyTo(command.from, reply)
    } else if (command.type === "tabs_ops_result") {
      const waiter = pending.get(command.replyTo)
      if (waiter && waiter.kind === "tabs_ops") {
        pending.delete(command.replyTo)
        waiter.resolve({
          ok: command.ok,
          detail: command.detail,
          rttMs: Math.max(0, Date.now() - waiter.at)
        })
      }
    } else if (command.type === "search_query_result") {
      const waiter = pending.get(command.replyTo)
      if (waiter && waiter.kind === "search_query") {
        pending.delete(command.replyTo)
        waiter.resolve({
          ok: command.ok,
          detail: command.detail,
          hits: command.hits,
          rttMs: Math.max(0, Date.now() - waiter.at)
        })
      }
    }
    if (commandHandler) {
      await commandHandler(command)
    }
  }

  peerHost.setHandlers({
    onCommand: (command) => {
      void handleIncoming(command)
    },
    onConnectionState: (deviceId, state) => {
      setMappedState(deviceId, mapPeerState(state))
    }
  })

  function armTimeout(id: string, timeoutMs: number): void {
    setTimeout(() => {
      const waiter = pending.get(id)
      if (!waiter) {
        return
      }
      pending.delete(id)
      if (waiter.kind === "tabs_list") {
        waiter.resolve({ ok: false, detail: "timeout", rows: [], rttMs: null })
        return
      }
      if (waiter.kind === "search_query") {
        waiter.resolve({ ok: false, detail: "timeout", hits: [], rttMs: null })
        return
      }
      waiter.resolve({ ok: false, detail: "timeout", rttMs: null })
    }, timeoutMs)
  }

  return {
    async connect(remoteDeviceId: SyncDeviceId) {
      // EN: Handshake must already have established the DataChannel (copy-paste codes).
      await peerHost.ensureReady()
      const mapped = mapPeerState(peerHost.getConnectionState(remoteDeviceId))
      setMappedState(remoteDeviceId, mapped)
      return mapped
    },

    async disconnect(remoteDeviceId: SyncDeviceId) {
      await peerHost.closeSession(remoteDeviceId)
      setMappedState(remoteDeviceId, "disconnected")
    },

    async ping(remoteDeviceId: SyncDeviceId) {
      const device = await loadOrCreateDeviceIdentity()
      const id = bytesToBase64Url(randomBytes(8))
      const command: SyncBusCommand = {
        type: "ping",
        id,
        from: device.deviceId,
        at: Date.now()
      }
      const resultPromise = new Promise<{
        ok: boolean
        detail: string | null
        rttMs: number | null
      }>((resolve) => {
        pending.set(id, { kind: "ack", resolve, at: Date.now() })
        armTimeout(id, 8000)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        await commandQueue.enqueue(remoteDeviceId, command)
        setMappedState(remoteDeviceId, "queued")
      }
      const result = await resultPromise
      return { ok: result.ok, rttMs: result.rttMs }
    },

    async openTabs(remoteDeviceId, urls, groupTitle) {
      const device = await loadOrCreateDeviceIdentity()
      const id = bytesToBase64Url(randomBytes(8))
      const command: SyncBusCommand = {
        type: "open_tabs",
        id,
        from: device.deviceId,
        urls,
        groupTitle
      }
      const resultPromise = new Promise<{
        ok: boolean
        detail: string | null
        rttMs: number | null
      }>((resolve) => {
        pending.set(id, { kind: "open", resolve, at: Date.now() })
        armTimeout(id, 15_000)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        await commandQueue.enqueue(remoteDeviceId, command)
        setMappedState(remoteDeviceId, "queued")
        return { ok: false, detail: "not_connected" }
      }
      const result = await resultPromise
      return { ok: result.ok, detail: result.detail }
    },

    async listTabs(remoteDeviceId, showUrl) {
      const device = await loadOrCreateDeviceIdentity()
      const id = bytesToBase64Url(randomBytes(8))
      const command: SyncBusCommand = {
        type: "tabs_list",
        id,
        from: device.deviceId,
        showUrl
      }
      const resultPromise = new Promise<{
        ok: boolean
        detail: string | null
        rows: SyncRemoteTabRow[]
        rttMs: number | null
      }>((resolve) => {
        pending.set(id, { kind: "tabs_list", resolve, at: Date.now() })
        armTimeout(id, SYNC_REMOTE_QUERY_TIMEOUT_MS)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        pending.delete(id)
        return { ok: false, detail: "not_connected", rows: [] }
      }
      const result = await resultPromise
      return { ok: result.ok, detail: result.detail, rows: result.rows }
    },

    async searchQuery(remoteDeviceId, dispatchLine) {
      const device = await loadOrCreateDeviceIdentity()
      const id = bytesToBase64Url(randomBytes(8))
      const command: SyncBusCommand = {
        type: "search_query",
        id,
        from: device.deviceId,
        dispatchLine
      }
      const resultPromise = new Promise<{
        ok: boolean
        detail: string | null
        hits: SyncRemoteSearchHit[]
        rttMs: number | null
      }>((resolve) => {
        pending.set(id, { kind: "search_query", resolve, at: Date.now() })
        armTimeout(id, SYNC_REMOTE_QUERY_TIMEOUT_MS)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        pending.delete(id)
        return { ok: false, detail: "not_connected", hits: [] }
      }
      const result = await resultPromise
      return { ok: result.ok, detail: result.detail, hits: result.hits }
    },

    async tabsOps(remoteDeviceId, op: SyncTabsOp) {
      const device = await loadOrCreateDeviceIdentity()
      const id = bytesToBase64Url(randomBytes(8))
      const command: SyncBusCommand = {
        type: "tabs_ops",
        id,
        from: device.deviceId,
        op
      }
      const resultPromise = new Promise<{
        ok: boolean
        detail: string | null
        rttMs: number | null
      }>((resolve) => {
        pending.set(id, { kind: "tabs_ops", resolve, at: Date.now() })
        armTimeout(id, SYNC_REMOTE_QUERY_TIMEOUT_MS)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        pending.delete(id)
        return { ok: false, detail: "not_connected" }
      }
      const result = await resultPromise
      return { ok: result.ok, detail: result.detail }
    },

    getState(remoteDeviceId) {
      return states.get(remoteDeviceId) ?? mapPeerState(peerHost.getConnectionState(remoteDeviceId))
    },

    listStates() {
      return [...states.entries()]
        .filter(([deviceId]) => deviceId !== "pending-offer")
        .map(([deviceId, state]) => ({ deviceId, state }))
    },

    discardState(remoteDeviceId) {
      if (!states.has(remoteDeviceId)) {
        return
      }
      states.delete(remoteDeviceId)
      notifyStates()
    },

    subscribeStates(listener) {
      stateListeners.add(listener)
      return () => {
        stateListeners.delete(listener)
      }
    },

    async drainQueue() {
      const device = await loadOrCreateDeviceIdentity()
      const commands = await commandQueue.dequeueFor(device.deviceId)
      for (const command of commands) {
        await handleIncoming(command)
      }
      return commands.length
    },

    onCommand(handler) {
      commandHandler = handler
    }
  }
}
