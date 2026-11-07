/**
 * EN: Wait until host ICE gathering finishes (no STUN — usually quick).
 * JA: host ICE 収集完了待ち（STUN なし・通常は短い）。
 */
export function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs = 4000
): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      pc.removeEventListener("icegatheringstatechange", onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        finish()
      }
    }
    pc.addEventListener("icegatheringstatechange", onChange)
    setTimeout(finish, timeoutMs)
  })
}
