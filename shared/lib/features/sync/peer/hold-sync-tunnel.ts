/**
 * EN: Keep the in-page SyncService warm while the prompt window is open.
 *     Drains the memory command queue and refreshes connection maps; does not
 *     open/close RTCPeerConnection sessions.
 * JA: プロンプト窓が開いている間 SyncService を温存する。
 *     メモリキュー消化と接続マップ更新のみ。RTC セッションの開閉はしない。
 */

const HOLD_INTERVAL_MS = 4000

type HoldTick = () => Promise<void>

let holdTimerId: ReturnType<typeof setInterval> | null = null
let holdTick: HoldTick | null = null

async function runHoldTick(): Promise<void> {
  if (holdTick === null) {
    return
  }
  try {
    await holdTick()
  } catch {
    /* EN: Keep trying — transient storage / RTC errors must not stop the hold loop. */
  }
}

/**
 * EN: Start a light keep-alive loop for the prompt-owned sync tunnel (idempotent).
 * JA: プロンプト宿主トンネルの軽量キープアライブを開始（冪等）。
 */
export function startSyncTunnelHold(tick: HoldTick): void {
  holdTick = tick
  if (holdTimerId !== null) {
    return
  }
  void runHoldTick()
  holdTimerId = setInterval(() => {
    void runHoldTick()
  }, HOLD_INTERVAL_MS)
}

/**
 * EN: Stop the keep-alive loop (e.g. tests). Does not close WebRTC sessions.
 * JA: キープアライブ停止（テスト用）。WebRTC セッションは閉じない。
 */
export function stopSyncTunnelHold(): void {
  if (holdTimerId === null) {
    return
  }
  clearInterval(holdTimerId)
  holdTimerId = null
  holdTick = null
}
