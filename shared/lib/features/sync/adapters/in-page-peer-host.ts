import { sealJsonPayload, unsealJsonPayload } from "../crypto/family-crypto"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { loadFamilyMembership } from "../device/family-membership"
import { WebrtcPeerSession } from "../peer/webrtc-session"
import type { PeerHostSessionHandlers, PeerHostStabilizer } from "../stabilizers/peer-host"
import type { SignalingBoxStabilizer } from "../stabilizers/signaling-box"
import type { SyncBusCommand, SyncDeviceId, SyncSignalPayload } from "../types"
import { SYNC_SIGNAL_TTL_MS } from "../workdir/bundle-layout"

function detectHostKind(): PeerHostStabilizer["hostKind"] {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  if (/Firefox\//.test(ua)) {
    return "firefox-page"
  }
  return "in-page"
}

export function createInPagePeerHostStabilizer(
  signaling: SignalingBoxStabilizer
): PeerHostStabilizer {
  const sessions = new Map<string, WebrtcPeerSession>()
  let handlers: PeerHostSessionHandlers | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function publishSignal(toDeviceId: SyncDeviceId, payload: SyncSignalPayload): Promise<void> {
    const membership = await loadFamilyMembership()
    const device = await loadOrCreateDeviceIdentity()
    if (membership === null) {
      return
    }
    const envelope = await sealJsonPayload({
      familyId: membership.familyId,
      seedB64: membership.seedB64,
      fromDeviceId: device.deviceId,
      toDeviceId,
      kind: "signal",
      payload,
      ttlMs: SYNC_SIGNAL_TTL_MS
    })
    if (envelope) {
      await signaling.put(envelope)
    }
  }

  function sessionKey(remoteDeviceId: SyncDeviceId): string {
    return remoteDeviceId
  }

  function attachSession(remoteDeviceId: SyncDeviceId, session: WebrtcPeerSession): void {
    sessions.set(sessionKey(remoteDeviceId), session)
  }

  function makeCallbacks(remoteDeviceId: SyncDeviceId) {
    return {
      onIceCandidate: (candidateJson: string) => {
        const session = sessions.get(sessionKey(remoteDeviceId))
        if (!session) {
          return
        }
        void publishSignal(remoteDeviceId, {
          type: "ice",
          sessionId: session.sessionId,
          candidate: candidateJson
        })
      },
      onCommand: (command: SyncBusCommand) => {
        void handlers?.onCommand(command)
      },
      onConnectionState: (state: string) => {
        handlers?.onConnectionState(remoteDeviceId, state)
      }
    }
  }

  async function pollSignals(): Promise<void> {
    const membership = await loadFamilyMembership()
    const device = await loadOrCreateDeviceIdentity()
    if (membership === null) {
      return
    }
    const envelopes = await signaling.listFor(device.deviceId)
    for (const env of envelopes) {
      if (env.kind !== "signal") {
        continue
      }
      const payload = await unsealJsonPayload<SyncSignalPayload>(env, membership.seedB64)
      await signaling.remove(env)
      if (!payload || typeof payload !== "object") {
        continue
      }
      void handlers?.onSignal(payload)
      if (payload.type === "offer") {
        const existing = sessions.get(sessionKey(env.fromDeviceId))
        existing?.close()
        const session = new WebrtcPeerSession(
          env.fromDeviceId,
          makeCallbacks(env.fromDeviceId),
          payload.sessionId
        )
        attachSession(env.fromDeviceId, session)
        const answerSdp = await session.acceptOffer(payload.sdp)
        await publishSignal(env.fromDeviceId, {
          type: "answer",
          sessionId: payload.sessionId,
          sdp: answerSdp
        })
      } else if (payload.type === "answer") {
        const session = [...sessions.values()].find((s) => s.sessionId === payload.sessionId)
        if (session) {
          await session.applyAnswer(payload.sdp)
        }
      } else if (payload.type === "ice") {
        const session = [...sessions.values()].find((s) => s.sessionId === payload.sessionId)
        if (session) {
          await session.addIceCandidate(payload.candidate)
        }
      }
    }
  }

  return {
    hostKind: detectHostKind(),

    async ensureReady() {
      if (pollTimer === null) {
        pollTimer = setInterval(() => {
          void pollSignals()
        }, 1500)
      }
      await pollSignals()
    },

    async createOfferSession(remoteDeviceId: SyncDeviceId) {
      await this.ensureReady()
      const existing = sessions.get(sessionKey(remoteDeviceId))
      existing?.close()
      const session = new WebrtcPeerSession(remoteDeviceId, makeCallbacks(remoteDeviceId))
      attachSession(remoteDeviceId, session)
      const sdp = await session.createOffer()
      await publishSignal(remoteDeviceId, {
        type: "offer",
        sessionId: session.sessionId,
        sdp
      })
      return { sessionId: session.sessionId, sdp }
    },

    async acceptOffer(remoteDeviceId, sessionId, sdp) {
      await this.ensureReady()
      const session = new WebrtcPeerSession(remoteDeviceId, makeCallbacks(remoteDeviceId), sessionId)
      attachSession(remoteDeviceId, session)
      const answer = await session.acceptOffer(sdp)
      return { sdp: answer }
    },

    async applyAnswer(sessionId, sdp) {
      const session = [...sessions.values()].find((s) => s.sessionId === sessionId)
      if (!session) {
        throw new Error("unknown session")
      }
      await session.applyAnswer(sdp)
    },

    async addIceCandidate(sessionId, candidate) {
      const session = [...sessions.values()].find((s) => s.sessionId === sessionId)
      if (!session) {
        return
      }
      await session.addIceCandidate(candidate)
    },

    async sendCommand(remoteDeviceId, command) {
      const session = sessions.get(sessionKey(remoteDeviceId))
      if (!session) {
        return false
      }
      return session.sendCommand(command)
    },

    getConnectionState(remoteDeviceId) {
      return sessions.get(sessionKey(remoteDeviceId))?.getConnectionState() ?? "new"
    },

    setHandlers(next) {
      handlers = next
    },

    async closeSession(remoteDeviceId) {
      const key = sessionKey(remoteDeviceId)
      sessions.get(key)?.close()
      sessions.delete(key)
    }
  }
}
