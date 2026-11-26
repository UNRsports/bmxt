/**
 * EN: Prompt-window hook — retry CLI localhost listener until linked or give up quietly.
 * JA: プロンプト窓フック。CLI localhost 待ち受けへ静かにリトライ。
 */

import { DEFAULT_CLI_DOOR_RETRY_MS } from "../../../setting/sync-timing.ts"
import { getSyncService } from "../../facade/sync-service.ts"

const MAX_ATTEMPTS = 45

let started = false
let retryMs = DEFAULT_CLI_DOOR_RETRY_MS

/**
 * EN: Idempotent — starts a background retry loop once per prompt window lifetime.
 * JA: 冪等。プロンプト窓の生存中にバックグラウンドリトライを一度だけ開始。
 */
export function startLocalhostDoorReconnect(
  intervalMs: number = DEFAULT_CLI_DOOR_RETRY_MS
): void {
  retryMs =
    typeof intervalMs === "number" && Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.round(intervalMs)
      : DEFAULT_CLI_DOOR_RETRY_MS
  if (started) {
    return
  }
  started = true
  void runLoop()
}

/** EN: Update retry interval for subsequent sleeps in the active loop. */
export function setLocalhostDoorRetryMs(intervalMs: number): void {
  retryMs =
    typeof intervalMs === "number" && Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.round(intervalMs)
      : DEFAULT_CLI_DOOR_RETRY_MS
}

async function runLoop(): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await getSyncService().tryLocalhostDoor()
      if (result.ok) {
        return
      }
      // EN: skipped = door down / no family / impostor — keep retrying while window lives.
    } catch {
      /* EN: Transient errors — retry. */
    }
    await sleep(retryMs)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
