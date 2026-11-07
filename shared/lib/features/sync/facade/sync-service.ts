import { loadOrCreateDeviceIdentity, setDeviceDisplayName } from "../device/device-identity"
import {
  buildInviteForLocalDevice,
  createFamilyMembership,
  joinFamilyFromInvite,
  loadFamilyMembership
} from "../device/family-membership"
import { createDefaultSyncStabilizers } from "./default-stabilizers"
import type { SyncStabilizers } from "../stabilizers"
import type {
  SyncDiscoveryRecord,
  SyncInviteV1,
  SyncRosterMember,
  SyncStatusSnapshot
} from "../types"
import { sanitizeGroupTitle, sanitizeRemoteOpenUrls } from "../bus/remote-open-sanitize.ts"
import { ensurePeerDocument } from "../peer/ensure-peer-document"

export type SyncService = {
  status(): Promise<SyncStatusSnapshot>
  pickDir(): Promise<{ ok: boolean; lines: string[] }>
  /**
   * EN: After the UI page opens `showDirectoryPicker` under a user gesture.
   * JA: UI がユーザー操作中に `showDirectoryPicker` したあとにハンドルを渡す。
   */
  bindPickedDir(
    handle: FileSystemDirectoryHandle,
    directoryName: string
  ): Promise<{ ok: boolean; lines: string[] }>
  pair(rawInvite: string): Promise<{ ok: boolean; lines: string[] }>
  members(): Promise<{ ok: boolean; lines: string[] }>
  pull(): Promise<{ ok: boolean; lines: string[] }>
  push(): Promise<{ ok: boolean; lines: string[] }>
  pause(): Promise<{ ok: boolean; lines: string[] }>
  openRemote(deviceId: string, urls: string[], groupTitle: string | null): Promise<{ ok: boolean; lines: string[] }>
  connect(deviceId: string): Promise<{ ok: boolean; lines: string[] }>
  setDisplayName(name: string): Promise<{ ok: boolean; lines: string[] }>
}

function line(text: string): string {
  return text
}

export function createSyncService(stabilizers: SyncStabilizers = createDefaultSyncStabilizers()): SyncService {
  const s = stabilizers

  async function ensureFamily(): Promise<void> {
    const existing = await loadFamilyMembership()
    if (existing === null) {
      await createFamilyMembership()
    }
  }

  return {
    async status() {
      await ensureFamily()
      const device = await loadOrCreateDeviceIdentity()
      const family = await loadFamilyMembership()
      const workdir = await s.store.getWorkdirConfig()
      let members: SyncRosterMember[] = []
      const roster = await s.store.readRoster()
      if (roster) {
        members = roster.members
      }
      const inviteDoc = await buildInviteForLocalDevice()
      const invite = inviteDoc ? s.discovery.formatInvite(inviteDoc) : null
      await s.commandBus.drainQueue()
      return {
        device,
        family,
        workdir,
        members,
        connections: s.commandBus.listStates(),
        invite
      }
    },

    async pickDir() {
      const result = await s.store.pickWorkdir()
      if ("cancelled" in result && result.cancelled) {
        return { ok: false, lines: [line("sync.dir.cancelled")] }
      }
      if (!result.ok) {
        return { ok: false, lines: [line(`sync.dir.error:${"error" in result ? result.error : "unknown"}`)] }
      }
      await ensureFamily()
      await s.store.pushAll()
      return { ok: true, lines: [line(`sync.dir.ok:${result.directoryName}`)] }
    },

    async bindPickedDir(handle: FileSystemDirectoryHandle, directoryName: string) {
      const result = await s.store.bindWorkdir(handle, directoryName)
      if (!result.ok) {
        const code = "error" in result ? result.error : "unknown"
        return { ok: false, lines: [line(`sync.dir.error:${code}`)] }
      }
      await ensureFamily()
      await s.store.pushAll()
      return { ok: true, lines: [line(`sync.dir.ok:${result.directoryName}`)] }
    },

    async pair(rawInvite: string) {
      await ensureFamily()
      const trimmed = rawInvite.trim()
      if (trimmed.length === 0) {
        const invite = await buildInviteForLocalDevice()
        if (invite === null) {
          return { ok: false, lines: [line("sync.pair.noFamily")] }
        }
        const token = s.discovery.formatInvite(invite)
        const qr = s.discovery.formatInviteQrPayload(invite)
        return {
          ok: true,
          lines: [
            line("sync.pair.created"),
            line(`sync.pair.invite:${token}`),
            line(`sync.pair.qr:${qr}`)
          ]
        }
      }
      const parsed = s.discovery.parseInvite(trimmed)
      if (parsed === null) {
        return { ok: false, lines: [line("sync.pair.invalidInvite")] }
      }
      const joined = await joinFamilyFromInvite(parsed)
      if (joined === null) {
        return { ok: false, lines: [line("sync.pair.joinFailed")] }
      }
      const record: SyncDiscoveryRecord = {
        deviceId: parsed.fromDeviceId,
        displayName: parsed.fromDisplayName,
        familyId: parsed.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      }
      await s.discovery.rememberManual(record)
      await s.store.pushAll()
      return {
        ok: true,
        lines: [
          line(`sync.pair.joined:${parsed.familyId}`),
          line(`sync.pair.peer:${parsed.fromDisplayName}`)
        ]
      }
    },

    async members() {
      await ensureFamily()
      await s.store.pullAll()
      const roster = await s.store.readRoster()
      const known = await s.discovery.listKnown()
      const lines: string[] = [line("sync.members.header")]
      if (roster) {
        for (const m of roster.members) {
          lines.push(
            line(
              `sync.members.row:${m.displayName}|${m.deviceId}|${m.browser}|${m.updatedAt}`
            )
          )
        }
      }
      for (const d of known) {
        if (roster?.members.some((m) => m.deviceId === d.deviceId)) {
          continue
        }
        lines.push(line(`sync.members.discovered:${d.displayName}|${d.deviceId}|${d.source}`))
      }
      if (lines.length === 1) {
        lines.push(line("sync.members.empty"))
      }
      return { ok: true, lines }
    },

    async pull() {
      const result = await s.store.pullAll()
      const drained = await s.commandBus.drainQueue()
      return {
        ok: result.prefs || result.roster || result.snapshots || drained > 0,
        lines: [
          line(
            `sync.pull.done:prefs=${result.prefs};roster=${result.roster};snapshots=${result.snapshots};queue=${drained}`
          )
        ]
      }
    },

    async push() {
      const result = await s.store.pushAll()
      return {
        ok: result.prefs || result.roster || result.snapshots,
        lines: [
          line(
            `sync.push.done:prefs=${result.prefs};roster=${result.roster};snapshots=${result.snapshots}`
          )
        ]
      }
    },

    async pause() {
      const config = await s.store.getWorkdirConfig()
      const next = { ...config, paused: !config.paused }
      await s.store.setWorkdirConfig(next)
      return {
        ok: true,
        lines: [line(next.paused ? "sync.pause.on" : "sync.pause.off")]
      }
    },

    async openRemote(deviceId: string, urls: string[], groupTitle: string | null) {
      const safeUrls = sanitizeRemoteOpenUrls(urls)
      if (safeUrls.length === 0) {
        return { ok: false, lines: [line("sync.open.noUrls")] }
      }
      const title = sanitizeGroupTitle(groupTitle)
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = s.commandBus.getState(deviceId)
      if (state !== "connected") {
        await s.commandBus.connect(deviceId)
      }
      const result = await s.commandBus.openTabs(deviceId, safeUrls, title)
      return {
        ok: result.ok,
        lines: [line(`sync.open.done:ok=${result.ok};detail=${result.detail ?? ""}`)]
      }
    },

    async connect(deviceId: string) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      const ping = await s.commandBus.ping(deviceId)
      return {
        ok: true,
        lines: [
          line(`sync.connect.state:${state}`),
          line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
        ]
      }
    },

    async setDisplayName(name: string) {
      const next = await setDeviceDisplayName(name)
      if (next === null) {
        return { ok: false, lines: [line("sync.name.invalid")] }
      }
      await s.store.pushAll()
      return { ok: true, lines: [line(`sync.name.ok:${next.displayName}`)] }
    }
  }
}

let singleton: SyncService | null = null

export function getSyncService(): SyncService {
  if (singleton === null) {
    singleton = createSyncService()
  }
  return singleton
}

/** EN: Test hook — replace singleton wiring. */
export function setSyncServiceForTests(service: SyncService | null): void {
  singleton = service
}

export type { SyncInviteV1 }
