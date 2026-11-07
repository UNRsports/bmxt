import { loadOrCreateDeviceIdentity, setDeviceDisplayName } from "../device/device-identity"
import {
  buildInviteForLocalDevice,
  createFamilyMembership,
  joinFamilyFromInvite,
  loadFamilyMembership
} from "../device/family-membership"
import { connectRoleForPeer, type SyncConnectRole } from "../bus/connect-role.ts"
import {
  clearSyncConnectPending,
  getSyncConnectPending,
  setSyncConnectPending
} from "../connect/sync-connect-pending.ts"
import {
  formatRtcHandshakeCode,
  parseRtcHandshakeCode,
  RTC_HANDSHAKE_TTL_MS_CONNECT,
  type RtcHandshakePlain
} from "../discovery/rtc-handshake-codec"
import { createDefaultSyncStabilizers } from "./default-stabilizers"
import type { SyncStabilizers } from "../stabilizers"
import type {
  SyncDiscoveryRecord,
  SyncRemoteSearchHit,
  SyncRemoteTabRow,
  SyncRosterMember,
  SyncStatusSnapshot
} from "../types"
import { sanitizeGroupTitle, sanitizeRemoteOpenUrls } from "../bus/remote-open-sanitize.ts"
import { ensurePeerDocument } from "../peer/ensure-peer-document"
import { loadLocalRoster, upsertLocalRosterMember } from "../adapters/local-roster-store"

export type SyncConnectSession = {
  peerDeviceId: string
  peerDisplayName: string
  role: SyncConnectRole
  outboundCode: string | null
  awaitingInbound: boolean
}

export type SyncConnectResult = {
  ok: boolean
  lines: string[]
  alreadyConnected?: boolean
  session?: SyncConnectSession
}

export type SyncService = {
  status(): Promise<SyncStatusSnapshot>
  pair(rawInvite: string): Promise<{ ok: boolean; lines: string[] }>
  members(): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Create offer code for the other browser to paste. */
  offer(): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Accept offer code; return answer code to paste back. */
  answer(offerCode: string): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Accept answer code on the offerer side; DataChannel should connect. */
  accept(answerCode: string): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Reconnect to a roster member without -setup wizard. */
  connect(deviceId: string): Promise<SyncConnectResult>
  openRemote(
    deviceId: string,
    urls: string[],
    groupTitle: string | null
  ): Promise<{ ok: boolean; lines: string[] }>
  listRemoteTabs(
    deviceId: string,
    showUrl: boolean
  ): Promise<{ ok: boolean; detail: string | null; rows: SyncRemoteTabRow[] }>
  searchRemote(
    deviceId: string,
    dispatchLine: string
  ): Promise<{ ok: boolean; detail: string | null; hits: SyncRemoteSearchHit[] }>
  ping(deviceId: string): Promise<{ ok: boolean; lines: string[] }>
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

  async function requireFamily() {
    await ensureFamily()
    const membership = await loadFamilyMembership()
    const device = await loadOrCreateDeviceIdentity()
    if (membership === null) {
      return null
    }
    return { membership, device }
  }

  return {
    async status() {
      await ensureFamily()
      const device = await loadOrCreateDeviceIdentity()
      const family = await loadFamilyMembership()
      let members: SyncRosterMember[] = []
      const roster = await loadLocalRoster()
      if (roster) {
        members = roster.members
      }
      const inviteDoc = await buildInviteForLocalDevice()
      const invite = inviteDoc ? s.discovery.formatInvite(inviteDoc) : null
      await s.commandBus.drainQueue()
      return {
        device,
        family,
        members,
        connections: s.commandBus.listStates(),
        invite
      }
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
      if ((await joinFamilyFromInvite(parsed)) === null) {
        return { ok: false, lines: [line("sync.pair.joinFailed")] }
      }
      const peer: SyncDiscoveryRecord = {
        deviceId: parsed.fromDeviceId,
        displayName: parsed.fromDisplayName,
        familyId: parsed.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      }
      await s.discovery.rememberManual(peer)
      await upsertLocalRosterMember({
        deviceId: parsed.fromDeviceId,
        displayName: parsed.fromDisplayName,
        browser: "unknown",
        familyId: parsed.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
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
      const roster = await loadLocalRoster()
      const known = await s.discovery.listKnown()
      const lines = [line("sync.members.header")]
      if (roster) {
        for (const m of roster.members) {
          lines.push(
            line(`sync.members.row:${m.displayName}|${m.deviceId}|${m.browser}|${m.updatedAt}`)
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

    async offer() {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const bundle = await s.peerHost.createOfferHandshake()
      const plain: RtcHandshakePlain = {
        v: 1,
        role: "offer",
        sessionId: bundle.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        plain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      return {
        ok: true,
        lines: [line("sync.rtc.offerCreated"), line(`sync.rtc.code:${code}`)]
      }
    },

    async answer(offerCode: string) {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const plain = await parseRtcHandshakeCode(offerCode, ctx.membership.seedB64)
      if (plain === null || plain.role !== "offer") {
        return { ok: false, lines: [line("sync.rtc.invalidCode")] }
      }
      if (plain.familyId !== ctx.membership.familyId) {
        return { ok: false, lines: [line("sync.rtc.familyMismatch")] }
      }
      if (
        typeof plain.toDeviceId === "string" &&
        plain.toDeviceId !== "*" &&
        plain.toDeviceId !== ctx.device.deviceId
      ) {
        return { ok: false, lines: [line("sync.rtc.wrongAddressee")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      let accepted: { sessionId: string; sdp: string; ice: string[]; remoteDeviceId: string }
      try {
        accepted = await s.peerHost.acceptOfferHandshake(plain)
      } catch {
        return { ok: false, lines: [line("sync.rtc.acceptFailed")] }
      }
      await s.discovery.rememberManual({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        familyId: plain.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      })
      await upsertLocalRosterMember({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        browser: "unknown",
        familyId: plain.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
      const answerPlain: RtcHandshakePlain = {
        v: 1,
        role: "answer",
        sessionId: accepted.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        toDeviceId: plain.fromDeviceId,
        sdp: accepted.sdp,
        ice: accepted.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        toDeviceId: plain.fromDeviceId,
        ttlMs: RTC_HANDSHAKE_TTL_MS_CONNECT,
        plain: answerPlain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      const pending = getSyncConnectPending()
      if (
        pending !== null &&
        pending.role === "answer" &&
        pending.peerDeviceId === plain.fromDeviceId
      ) {
        setSyncConnectPending({
          peerDeviceId: pending.peerDeviceId,
          peerDisplayName: pending.peerDisplayName,
          role: "answer",
          outboundCode: code,
          awaitingInbound: false
        })
      }
      const lines = [
        line("sync.rtc.answerCreated"),
        line(`sync.rtc.peer:${plain.fromDisplayName}`),
        line(`sync.rtc.code:${code}`)
      ]
      if (pending !== null && pending.role === "answer") {
        lines.push(line("sync.connect.copyThenWaitPeerAccept"))
      }
      return { ok: true, lines }
    },

    async accept(answerCode: string) {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const plain = await parseRtcHandshakeCode(answerCode, ctx.membership.seedB64)
      if (plain === null || plain.role !== "answer") {
        return { ok: false, lines: [line("sync.rtc.invalidCode")] }
      }
      if (plain.familyId !== ctx.membership.familyId) {
        return { ok: false, lines: [line("sync.rtc.familyMismatch")] }
      }
      if (
        typeof plain.toDeviceId === "string" &&
        plain.toDeviceId !== "*" &&
        plain.toDeviceId !== ctx.device.deviceId
      ) {
        return { ok: false, lines: [line("sync.rtc.wrongAddressee")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      let remoteDeviceId: string
      try {
        remoteDeviceId = await s.peerHost.applyAnswerHandshake(plain)
      } catch {
        return { ok: false, lines: [line("sync.rtc.acceptFailed")] }
      }
      await s.discovery.rememberManual({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        familyId: plain.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      })
      await upsertLocalRosterMember({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        browser: "unknown",
        familyId: plain.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
      // EN: Handshake success is enough to finish setup. Ping may fail briefly
      // right after the DataChannel opens; treat it as diagnostics only.
      const ping = await s.commandBus.ping(remoteDeviceId)
      const lines = [
        line(`sync.rtc.connected:${plain.fromDisplayName}`),
        line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
      ]
      if (!ping.ok) {
        lines.push(line("sync.rtc.pingDeferred"))
      }
      clearSyncConnectPending()
      return { ok: true, lines }
    },

    async connect(deviceId: string): Promise<SyncConnectResult> {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const trimmed = deviceId.trim()
      if (trimmed.length === 0 || trimmed === ctx.device.deviceId) {
        return { ok: false, lines: [line("sync.connect.badDeviceId")] }
      }
      const roster = await loadLocalRoster()
      const member = roster?.members.find((m) => m.deviceId === trimmed) ?? null
      const discovered = (await s.discovery.listKnown()).find((d) => d.deviceId === trimmed)
      if (member === null && discovered === undefined) {
        return { ok: false, lines: [line("sync.connect.unknownMember")] }
      }
      const peerDisplayName =
        member?.displayName ?? discovered?.displayName ?? trimmed

      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(trimmed)
      if (state === "connected") {
        clearSyncConnectPending()
        const ping = await s.commandBus.ping(trimmed)
        return {
          ok: ping.ok,
          alreadyConnected: true,
          lines: [
            line(`sync.rtc.connected:${peerDisplayName}`),
            line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
          ]
        }
      }

      const role = connectRoleForPeer(ctx.device.deviceId, trimmed)
      if (role === "answer") {
        const session = {
          peerDeviceId: trimmed,
          peerDisplayName,
          role: "answer" as const,
          outboundCode: null,
          awaitingInbound: true
        }
        setSyncConnectPending(session)
        return {
          ok: true,
          session,
          lines: [
            line(`sync.connect.role:answer`),
            line(`sync.connect.peer:${peerDisplayName}|${trimmed}`),
            line("sync.connect.waitOffer")
          ]
        }
      }

      const bundle = await s.peerHost.createOfferHandshake()
      const plain: RtcHandshakePlain = {
        v: 1,
        role: "offer",
        sessionId: bundle.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        toDeviceId: trimmed,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        toDeviceId: trimmed,
        ttlMs: RTC_HANDSHAKE_TTL_MS_CONNECT,
        plain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      const session = {
        peerDeviceId: trimmed,
        peerDisplayName,
        role: "offer" as const,
        outboundCode: code,
        awaitingInbound: true
      }
      setSyncConnectPending(session)
      return {
        ok: true,
        session,
        lines: [
          line(`sync.connect.role:offer`),
          line(`sync.connect.peer:${peerDisplayName}|${trimmed}`),
          line("sync.rtc.offerCreated"),
          line(`sync.rtc.code:${code}`),
          line("sync.connect.copyThenWaitAnswer")
        ]
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
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return {
          ok: false,
          lines: [line("sync.open.notConnected"), line(`sync.connect.state:${state}`)]
        }
      }
      const result = await s.commandBus.openTabs(deviceId, safeUrls, title)
      return {
        ok: result.ok,
        lines: [line(`sync.open.done:ok=${result.ok};detail=${result.detail ?? ""}`)]
      }
    },

    async listRemoteTabs(deviceId: string, showUrl: boolean) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return { ok: false, detail: `not_connected:${state}`, rows: [] }
      }
      return s.commandBus.listTabs(deviceId, showUrl)
    },

    async searchRemote(deviceId: string, dispatchLine: string) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return { ok: false, detail: `not_connected:${state}`, hits: [] }
      }
      return s.commandBus.searchQuery(deviceId, dispatchLine)
    },

    async ping(deviceId: string) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      const ping = await s.commandBus.ping(deviceId)
      return {
        ok: ping.ok,
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
