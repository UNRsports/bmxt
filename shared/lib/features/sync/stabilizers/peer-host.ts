import type { RtcHandshakePlain } from "../discovery/rtc-handshake-codec"
import type { SyncBusCommand, SyncDeviceId } from "../types"

export type PeerHostSessionHandlers = {
  onCommand: (command: SyncBusCommand) => void | Promise<void>
  onConnectionState: (deviceId: SyncDeviceId, state: string) => void
}

/**
 * EN: Stabilizer — document that owns RTCPeerConnection (Chrome offscreen / Firefox page).
 * JA: RTCPeerConnection を持つ peer 宿主スタビライザー。
 */
export type PeerHostStabilizer = {
  readonly hostKind: "chrome-offscreen" | "firefox-page" | "in-page"
  ensureReady(): Promise<void>
  /**
   * EN: Create a local offer; ICE is bundled for copy-paste (remote id unknown until answer).
   * JA: ローカル offer 作成。ICE はコピペ用に同梱（answer まで相手 ID 不明）。
   */
  createOfferHandshake(): Promise<{
    sessionId: string
    sdp: string
    ice: string[]
  }>
  /**
   * EN: Accept a remote offer code payload; returns local answer bundle.
   * JA: 相手の offer を受理し、ローカル answer 束を返す。
   */
  acceptOfferHandshake(plain: RtcHandshakePlain): Promise<{
    sessionId: string
    sdp: string
    ice: string[]
    remoteDeviceId: SyncDeviceId
  }>
  /**
   * EN: Apply a remote answer code to the pending local offer session.
   * JA: 保留中のローカル offer に相手の answer を適用。
   */
  applyAnswerHandshake(plain: RtcHandshakePlain): Promise<SyncDeviceId>
  sendCommand(remoteDeviceId: SyncDeviceId, command: SyncBusCommand): Promise<boolean>
  getConnectionState(remoteDeviceId: SyncDeviceId): string
  setHandlers(handlers: PeerHostSessionHandlers): void
  closeSession(remoteDeviceId: SyncDeviceId): Promise<void>
}
