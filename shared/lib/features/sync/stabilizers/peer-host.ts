import type { SyncBusCommand, SyncDeviceId, SyncSignalPayload } from "../types"

export type PeerHostSessionHandlers = {
  onSignal: (payload: SyncSignalPayload) => void | Promise<void>
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
  createOfferSession(remoteDeviceId: SyncDeviceId): Promise<{ sessionId: string; sdp: string }>
  acceptOffer(
    remoteDeviceId: SyncDeviceId,
    sessionId: string,
    sdp: string
  ): Promise<{ sdp: string }>
  applyAnswer(sessionId: string, sdp: string): Promise<void>
  addIceCandidate(sessionId: string, candidate: string): Promise<void>
  sendCommand(remoteDeviceId: SyncDeviceId, command: SyncBusCommand): Promise<boolean>
  getConnectionState(remoteDeviceId: SyncDeviceId): string
  setHandlers(handlers: PeerHostSessionHandlers): void
  closeSession(remoteDeviceId: SyncDeviceId): Promise<void>
}
