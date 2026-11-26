/**
 * EN: Keep the in-page SyncService warm while the prompt window is open.
 *     Drains the memory command queue and refreshes connection maps; does not
 *     open/close RTCPeerConnection sessions.
 * JA: プロンプト窓が開いている間 SyncService を温存する。
 *     メモリキュー消化と接続マップ更新のみ。RTC セッションの開閉はしない。
 */

import { DEFAULT_SYNC_HOLD_INTERVAL_MS } from "../../setting/sync-timing.ts"

type HoldTick = () => Promise<void>

let holdTimerId: ReturnType<typeof setTimeout> | null = null
let holdTick: HoldTick | null = null
let holdIntervalMs = DEFAULT_SYNC_HOLD_INTERVAL_MS
let holdGeneration = 0

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

function scheduleNextHold(generation: number): void {
  if (holdTick === null || generation !== holdGeneration) {
    return
  }
  holdTimerId = setTimeout(() => {
    void (async () => {
      await runHoldTick()
      scheduleNextHold(generation)
    })()
  }, holdIntervalMs)
}

/**
 * EN: Start a light keep-alive loop for the prompt-owned sync tunnel (idempotent).
 * JA: プロンプト宿主トンネルの軽量キープアライブを開始（冪等）。
 */
export function startSyncTunnelHold(
  tick: HoldTick,
  intervalMs: number = DEFAULT_SYNC_HOLD_INTERVAL_MS
): void {
  holdTick = tick
  holdIntervalMs =
    typeof intervalMs === "number" && Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.round(intervalMs)
      : DEFAULT_SYNC_HOLD_INTERVAL_MS
  if (holdTimerId !== null) {
    return
  }
  holdGeneration += 1
  const generation = holdGeneration
  void runHoldTick()
  scheduleNextHold(generation)
}

/**
 * EN: Update the hold interval without restarting the tick function (next sleep uses it).
 * JA: tick 関数はそのままに hold 間隔だけ更新する（次の待機から反映）。
 */
export function setSyncTunnelHoldIntervalMs(intervalMs: number): void {
  holdIntervalMs =
    typeof intervalMs === "number" && Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.round(intervalMs)
      : DEFAULT_SYNC_HOLD_INTERVAL_MS
}

/**
 * EN: Stop the keep-alive loop (e.g. tests). Does not close WebRTC sessions.
 * JA: キープアライブ停止（テスト用）。WebRTC セッションは閉じない。
 */
export function stopSyncTunnelHold(): void {
  holdGeneration += 1
  if (holdTimerId !== null) {
    clearTimeout(holdTimerId)
    holdTimerId = null
  }
  holdTick = null
}
