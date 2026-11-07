import { bytesToBase64Url, randomBytes } from "../crypto/bytes"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import type { CommandBusStabilizer } from "../stabilizers/command-bus"
import type { CommandQueueStabilizer } from "../stabilizers/command-queue"
import type { PeerHostStabilizer } from "../stabilizers/peer-host"
import type { SyncBusCommand, SyncConnectionState, SyncDeviceId } from "../types"
import { applyRemoteOpenTabs } from "../bus/remote-open"
import { getRunLocale } from "../../setting/i18n/run-locale"

function mapPeerState(raw: string): SyncConnectionState {
  if (raw === "connected") {
    return "connected"
  }
  if (raw === "connecting" || raw === "checking") {
    return "signaling"
  }
  if (raw === "disconnected" || raw === "failed" || raw === "closed") {
    return "disconnected"
  }
  return "idle"
}

export function createWebrtcCommandBusStabilizer(
  peerHost: PeerHostStabilizer,
  commandQueue: CommandQueueStabilizer
): CommandBusStabilizer {
  const states = new Map<SyncDeviceId, SyncConnectionState>()
  let commandHandler: ((command: SyncBusCommand) => void | Promise<void>) | null = null
  const pendingAcks = new Map<
    string,
    {
      resolve: (value: { ok: boolean; detail: string | null; rttMs: number | null }) => void
      at: number
    }
  >()

  async function handleIncoming(command: SyncBusCommand): Promise<void> {
    if (command.type === "ack") {
      const waiter = pendingAcks.get(command.replyTo)
      if (waiter) {
        pendingAcks.delete(command.replyTo)
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
      const sent = await peerHost.sendCommand(command.from, ack)
      if (!sent) {
        await commandQueue.enqueue(command.from, ack)
      }
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
      const sent = await peerHost.sendCommand(command.from, reply)
      if (!sent) {
        await commandQueue.enqueue(command.from, reply)
      }
    } else if (command.type === "open_tabs_result") {
      const waiter = pendingAcks.get(command.replyTo)
      if (waiter) {
        pendingAcks.delete(command.replyTo)
        waiter.resolve({
          ok: command.ok,
          detail: command.detail,
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
      states.set(deviceId, mapPeerState(state))
    }
  })

  return {
    async connect(remoteDeviceId: SyncDeviceId) {
      // EN: Handshake must already have established the DataChannel (copy-paste codes).
      await peerHost.ensureReady()
      const mapped = mapPeerState(peerHost.getConnectionState(remoteDeviceId))
      states.set(remoteDeviceId, mapped)
      return mapped
    },

    async disconnect(remoteDeviceId: SyncDeviceId) {
      await peerHost.closeSession(remoteDeviceId)
      states.set(remoteDeviceId, "disconnected")
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
        pendingAcks.set(id, { resolve, at: Date.now() })
        setTimeout(() => {
          if (pendingAcks.has(id)) {
            pendingAcks.delete(id)
            resolve({ ok: false, detail: "timeout", rttMs: null })
          }
        }, 8000)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        await commandQueue.enqueue(remoteDeviceId, command)
        states.set(remoteDeviceId, "queued")
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
        pendingAcks.set(id, { resolve, at: Date.now() })
        setTimeout(() => {
          if (pendingAcks.has(id)) {
            pendingAcks.delete(id)
            resolve({ ok: false, detail: "timeout", rttMs: null })
          }
        }, 15_000)
      })
      const sent = await peerHost.sendCommand(remoteDeviceId, command)
      if (!sent) {
        await commandQueue.enqueue(remoteDeviceId, command)
        states.set(remoteDeviceId, "queued")
        return { ok: false, detail: "not_connected" }
      }
      const result = await resultPromise
      return { ok: result.ok, detail: result.detail }
    },

    getState(remoteDeviceId) {
      return states.get(remoteDeviceId) ?? mapPeerState(peerHost.getConnectionState(remoteDeviceId))
    },

    listStates() {
      return [...states.entries()].map(([deviceId, state]) => ({ deviceId, state }))
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
