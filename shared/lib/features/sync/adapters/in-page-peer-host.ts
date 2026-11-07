import type { RtcHandshakePlain } from "../discovery/rtc-handshake-codec"
import { WebrtcPeerSession } from "../peer/webrtc-session"
import type { PeerHostSessionHandlers, PeerHostStabilizer } from "../stabilizers/peer-host"
import type { SyncBusCommand, SyncDeviceId } from "../types"

function detectHostKind(): PeerHostStabilizer["hostKind"] {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  if (/Firefox\//.test(ua)) {
    return "firefox-page"
  }
  return "in-page"
}

/**
 * EN: In-page / Firefox peer-page host — handshake via copy-paste codes (no FSA mailbox).
 * JA: in-page / Firefox peer ページ宿主。握手はコピペコード（FSA 箱なし）。
 */
export function createInPagePeerHostStabilizer(): PeerHostStabilizer {
  /** EN: sessionId → RTC session */
  const bySessionId = new Map<string, WebrtcPeerSession>()
  /** EN: remote device id → sessionId (filled once peer identity is known) */
  const sessionIdByRemote = new Map<SyncDeviceId, string>()
  /** EN: Offerer pending session before answer arrives */
  let pendingOfferSessionId: string | null = null
  let handlers: PeerHostSessionHandlers | null = null

  function resolveRemoteForSession(sessionId: string): SyncDeviceId | null {
    for (const [remote, sid] of sessionIdByRemote) {
      if (sid === sessionId) {
        return remote
      }
    }
    return null
  }

  function makeCallbacks(sessionId: string, fallbackRemote: SyncDeviceId) {
    return {
      onCommand: (command: SyncBusCommand) => {
        void handlers?.onCommand(command)
      },
      onConnectionState: (state: string) => {
        const remote = resolveRemoteForSession(sessionId) ?? fallbackRemote
        handlers?.onConnectionState(remote, state)
      }
    }
  }

  function rememberRemote(remoteDeviceId: SyncDeviceId, sessionId: string): void {
    sessionIdByRemote.set(remoteDeviceId, sessionId)
  }

  function sessionForRemote(remoteDeviceId: SyncDeviceId): WebrtcPeerSession | null {
    const sessionId = sessionIdByRemote.get(remoteDeviceId)
    if (!sessionId) {
      return null
    }
    return bySessionId.get(sessionId) ?? null
  }

  return {
    hostKind: detectHostKind(),

    async ensureReady() {
      /* no signaling poll */
    },

    async createOfferHandshake() {
      if (pendingOfferSessionId !== null) {
        bySessionId.get(pendingOfferSessionId)?.close()
        bySessionId.delete(pendingOfferSessionId)
        pendingOfferSessionId = null
      }
      // EN: Placeholder remote until answer names the peer.
      const placeholderRemote = "pending-offer"
      const session = new WebrtcPeerSession(placeholderRemote, {
        onCommand: (command) => {
          void handlers?.onCommand(command)
        },
        onConnectionState: (state) => {
          const remote = resolveRemoteForSession(session.sessionId) ?? placeholderRemote
          handlers?.onConnectionState(remote, state)
        }
      })
      bySessionId.set(session.sessionId, session)
      pendingOfferSessionId = session.sessionId
      const bundle = await session.createOffer()
      return {
        sessionId: session.sessionId,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
    },

    async acceptOfferHandshake(plain: RtcHandshakePlain) {
      const existingId = sessionIdByRemote.get(plain.fromDeviceId)
      if (existingId) {
        bySessionId.get(existingId)?.close()
        bySessionId.delete(existingId)
        sessionIdByRemote.delete(plain.fromDeviceId)
      }
      const session = new WebrtcPeerSession(
        plain.fromDeviceId,
        makeCallbacks(plain.sessionId, plain.fromDeviceId),
        plain.sessionId
      )
      bySessionId.set(session.sessionId, session)
      rememberRemote(plain.fromDeviceId, session.sessionId)
      const bundle = await session.acceptOffer(plain.sdp, plain.ice)
      return {
        sessionId: session.sessionId,
        sdp: bundle.sdp,
        ice: bundle.ice,
        remoteDeviceId: plain.fromDeviceId
      }
    },

    async applyAnswerHandshake(plain: RtcHandshakePlain) {
      const session =
        bySessionId.get(plain.sessionId) ??
        (pendingOfferSessionId !== null ? bySessionId.get(pendingOfferSessionId) : undefined)
      if (!session) {
        throw new Error("unknown session")
      }
      if (session.sessionId !== plain.sessionId) {
        throw new Error("session mismatch")
      }
      await session.applyAnswer(plain.sdp, plain.ice)
      rememberRemote(plain.fromDeviceId, session.sessionId)
      // EN: Rebind connection-state callbacks under the real remote id.
      pendingOfferSessionId = null
      // EN: Emit under the real device id (earlier ICE events may have used pending-offer).
      handlers?.onConnectionState(plain.fromDeviceId, session.getConnectionState())
      return plain.fromDeviceId
    },

    async sendCommand(remoteDeviceId, command) {
      const session = sessionForRemote(remoteDeviceId)
      if (!session) {
        return false
      }
      return session.sendCommand(command)
    },

    getConnectionState(remoteDeviceId) {
      return sessionForRemote(remoteDeviceId)?.getConnectionState() ?? "new"
    },

    listBoundRemoteDeviceIds() {
      return [...sessionIdByRemote.keys()].filter((id) => id !== "pending-offer")
    },

    setHandlers(next) {
      handlers = next
    },

    async closeSession(remoteDeviceId) {
      const sessionId = sessionIdByRemote.get(remoteDeviceId)
      if (!sessionId) {
        return
      }
      bySessionId.get(sessionId)?.close()
      bySessionId.delete(sessionId)
      sessionIdByRemote.delete(remoteDeviceId)
    }
  }
}
