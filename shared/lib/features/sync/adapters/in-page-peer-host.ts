import type { RtcHandshakePlain } from "../discovery/rtc-handshake-codec"
import { WebrtcPeerSession } from "../peer/webrtc-session"
import type { PeerHostSessionHandlers, PeerHostStabilizer } from "../stabilizers/peer-host"
import type { SyncBusCommand, SyncDeviceId } from "../types"

/**
 * EN: Prompt-window peer host — handshake via copy-paste codes (no offscreen / peer tab).
 * JA: プロンプト窓 peer 宿主。握手はコピペコード（offscreen / peer タブなし）。
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

  /**
   * EN: Drop a bound remote session without touching other live tunnels.
   * JA: 他の生存トンネルに触れず、指定 remote のセッションだけ捨てる。
   */
  function dropRemoteSession(remoteDeviceId: SyncDeviceId): void {
    const sessionId = sessionIdByRemote.get(remoteDeviceId)
    if (!sessionId) {
      return
    }
    bySessionId.get(sessionId)?.close()
    bySessionId.delete(sessionId)
    sessionIdByRemote.delete(remoteDeviceId)
    if (pendingOfferSessionId === sessionId) {
      pendingOfferSessionId = null
    }
  }

  return {
    hostKind: "in-page",

    async ensureReady() {
      /* EN: Prompt document is already the host — nothing to open. */
    },

    async createOfferHandshake() {
      // EN: Replace only an unanswered pending offer. Live tunnels to other peers stay up.
      // JA: 未回答の pending offer だけ差し替え。他ピアの生存トンネルは維持する。
      if (pendingOfferSessionId !== null) {
        const pending = bySessionId.get(pendingOfferSessionId)
        pending?.close()
        bySessionId.delete(pendingOfferSessionId)
        for (const [remote, sid] of sessionIdByRemote) {
          if (sid === pendingOfferSessionId) {
            sessionIdByRemote.delete(remote)
          }
        }
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

    async createDirectedOfferHandshake(remoteDeviceId: SyncDeviceId) {
      // EN: Mesh path — bind remote immediately; leave manual pending-offer untouched.
      // JA: メッシュ経路。remote を即バインドし、手動 pending-offer には触れない。
      const trimmed = remoteDeviceId.trim()
      if (trimmed.length === 0 || trimmed === "pending-offer") {
        throw new Error("invalid remote for directed offer")
      }
      dropRemoteSession(trimmed)
      let sessionIdHolder = ""
      const session = new WebrtcPeerSession(trimmed, {
        onCommand: (command) => {
          void handlers?.onCommand(command)
        },
        onConnectionState: (state) => {
          const remote = resolveRemoteForSession(sessionIdHolder) ?? trimmed
          handlers?.onConnectionState(remote, state)
        }
      })
      sessionIdHolder = session.sessionId
      bySessionId.set(session.sessionId, session)
      rememberRemote(trimmed, session.sessionId)
      const bundle = await session.createOffer()
      return {
        sessionId: session.sessionId,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
    },

    async acceptOfferHandshake(plain: RtcHandshakePlain) {
      // EN: Explicit re-handshake for this peer — replace any prior session to the same remote.
      // JA: 同一 peer への明示的再握手。旧セッションだけ差し替える。
      dropRemoteSession(plain.fromDeviceId)
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
      // EN: If this answer names a peer that still has an older live/zombie session, drop it.
      // JA: answer が指す peer に古いセッションが残っていれば捨ててから結び直す。
      const priorId = sessionIdByRemote.get(plain.fromDeviceId)
      if (priorId !== undefined && priorId !== session.sessionId) {
        bySessionId.get(priorId)?.close()
        bySessionId.delete(priorId)
        sessionIdByRemote.delete(plain.fromDeviceId)
      }
      await session.applyAnswer(plain.sdp, plain.ice)
      rememberRemote(plain.fromDeviceId, session.sessionId)
      if (pendingOfferSessionId === session.sessionId) {
        pendingOfferSessionId = null
      }
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

    async waitForSendBudget(remoteDeviceId, timeoutMs) {
      const session = sessionForRemote(remoteDeviceId)
      if (!session) {
        return false
      }
      return session.waitForSendBudget(timeoutMs)
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
      dropRemoteSession(remoteDeviceId)
    }
  }
}
