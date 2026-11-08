import type { RtcHandshakePlain } from "../discovery/rtc-handshake-codec"
import type { SyncBusCommand, SyncDeviceId } from "../types"

export type PeerHostSessionHandlers = {
  onCommand: (command: SyncBusCommand) => void | Promise<void>
  onConnectionState: (deviceId: SyncDeviceId, state: string) => void
}

/**
 * EN: Stabilizer — BMXt prompt document that owns RTCPeerConnection / DataChannel.
 * JA: プロンプト窓上で RTCPeerConnection / DataChannel を持つ peer 宿主スタビライザー。
 */
export type PeerHostStabilizer = {
  readonly hostKind: "in-page"
  ensureReady(): Promise<void>
  /**
   * EN: Create local offer + gather ICE; returns session id for the answer code.
   * JA: ローカル offer 作成と ICE 収集。answer コード用の session id を返す。
   */
  createOfferHandshake(): Promise<{
    sessionId: string
    sdp: string
    ice: string[]
  }>
  /**
   * EN: Apply remote offer; return local answer bundle + remote device id from plain.
   * JA: 相手 offer を適用し、ローカル answer と plain 上の相手 device id を返す。
   */
  acceptOfferHandshake(plain: RtcHandshakePlain): Promise<{
    sessionId: string
    sdp: string
    ice: string[]
    remoteDeviceId: SyncDeviceId
  }>
  /**
   * EN: Apply remote answer on the pending offer session.
   * JA: 保留中 offer セッションへ相手 answer を適用。
   */
  applyAnswerHandshake(plain: RtcHandshakePlain): Promise<SyncDeviceId>
  sendCommand(remoteDeviceId: SyncDeviceId, command: SyncBusCommand): Promise<boolean>
  getConnectionState(remoteDeviceId: SyncDeviceId): string
  listBoundRemoteDeviceIds(): SyncDeviceId[]
  setHandlers(handlers: PeerHostSessionHandlers): void
  /**
   * EN: Explicit tear-down only (user reconnect / disconnect). Never call on transient ICE blips.
   * JA: 明示切断のみ（再握手・disconnect）。ICE の一時断では呼ばない。
   */
  closeSession(remoteDeviceId: SyncDeviceId): Promise<void>
}
