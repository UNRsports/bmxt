/**
 * EN: Prompt-window hook — retry CLI localhost door until linked or give up quietly.
 * JA: プロンプト窓フック。CLI localhost 玄関へ静かにリトライ。
 */

import { getSyncService } from "../../facade/sync-service.ts"

const RETRY_MS = 4_000
const MAX_ATTEMPTS = 45

let started = false

/**
 * EN: Idempotent — starts a background retry loop once per prompt window lifetime.
 * JA: 冪等。プロンプト窓の生存中にバックグラウンドリトライを一度だけ開始。
 */
export function startLocalhostDoorReconnect(): void {
  if (started) {
    return
  }
  started = true
  void runLoop()
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
    await sleep(RETRY_MS)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
