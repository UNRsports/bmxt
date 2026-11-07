import { bytesToBase64Url, randomBytes } from "../crypto/bytes"
import type { SyncBusCommand, SyncDeviceId } from "../types"

/** EN: Host-candidate-only RTC — no public STUN/TURN (keeps connect-src / no external send). */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: []
}

export type WebrtcSessionCallbacks = {
  onIceCandidate: (candidateJson: string) => void
  onCommand: (command: SyncBusCommand) => void
  onConnectionState: (state: string) => void
}

function isBusCommand(value: unknown): value is SyncBusCommand {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return typeof o.type === "string" && typeof o.id === "string"
}

export class WebrtcPeerSession {
  readonly sessionId: string
  readonly remoteDeviceId: SyncDeviceId
  private readonly pc: RTCPeerConnection
  private channel: RTCDataChannel | null = null
  private readonly callbacks: WebrtcSessionCallbacks
  private readonly pendingCandidates: string[] = []

  constructor(remoteDeviceId: SyncDeviceId, callbacks: WebrtcSessionCallbacks, sessionId?: string) {
    this.remoteDeviceId = remoteDeviceId
    this.sessionId = sessionId ?? bytesToBase64Url(randomBytes(12))
    this.callbacks = callbacks
    this.pc = new RTCPeerConnection(RTC_CONFIG)
    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.callbacks.onIceCandidate(JSON.stringify(ev.candidate.toJSON()))
      }
    }
    this.pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionState(this.pc.connectionState)
    }
    this.pc.ondatachannel = (ev) => {
      this.bindChannel(ev.channel)
    }
  }

  private bindChannel(channel: RTCDataChannel): void {
    this.channel = channel
    channel.binaryType = "arraybuffer"
    channel.onmessage = (ev) => {
      try {
        const text = typeof ev.data === "string" ? ev.data : ""
        if (text.length === 0 || text.length > 200_000) {
          return
        }
        const parsed: unknown = JSON.parse(text)
        if (isBusCommand(parsed)) {
          this.callbacks.onCommand(parsed)
        }
      } catch {
        /* ignore malformed */
      }
    }
  }

  async createOffer(): Promise<string> {
    this.bindChannel(this.pc.createDataChannel("bmxt-sync", { ordered: true }))
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer.sdp ?? ""
  }

  async acceptOffer(sdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: "offer", sdp })
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    await this.flushPendingIce()
    return answer.sdp ?? ""
  }

  async applyAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: "answer", sdp })
    await this.flushPendingIce()
  }

  async addIceCandidate(candidateJson: string): Promise<void> {
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(candidateJson)
      return
    }
    try {
      const init = JSON.parse(candidateJson) as RTCIceCandidateInit
      await this.pc.addIceCandidate(init)
    } catch {
      /* ignore bad candidate */
    }
  }

  private async flushPendingIce(): Promise<void> {
    while (this.pendingCandidates.length > 0) {
      const next = this.pendingCandidates.shift()
      if (next) {
        await this.addIceCandidate(next)
      }
    }
  }

  sendCommand(command: SyncBusCommand): boolean {
    if (!this.channel || this.channel.readyState !== "open") {
      return false
    }
    try {
      this.channel.send(JSON.stringify(command))
      return true
    } catch {
      return false
    }
  }

  getConnectionState(): string {
    return this.pc.connectionState
  }

  close(): void {
    try {
      this.channel?.close()
    } catch {
      /* ignore */
    }
    try {
      this.pc.close()
    } catch {
      /* ignore */
    }
  }
}
