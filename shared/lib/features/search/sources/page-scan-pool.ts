/**
 * EN: Bounded concurrency pool for page-tab scans (preserves cancel checks between jobs).
 * JA: ページタブ走査用の上限付き並行プール（ジョブ間で cancel を見る）。
 */

export type PageScanPoolResult = {
  /** EN: True when a worker observed shouldCancel and stopped claiming new indices. */
  cancelled: boolean
  /** EN: How many indices were claimed for work (may exceed completed if cancel mid-flight). */
  claimed: number
}

/**
 * EN: Run `worker` over `0..itemCount-1` with at most `concurrency` in flight.
 *     Workers stop claiming new indices when `shouldCancel` is true.
 * JA: `0..itemCount-1` を最大 `concurrency` 並行で `worker` 実行。
 *     `shouldCancel` 時は新規 index を取らない。
 */
export async function runPageScanPool(
  itemCount: number,
  concurrency: number,
  worker: (index: number) => Promise<void>,
  shouldCancel?: () => boolean
): Promise<PageScanPoolResult> {
  const total = Math.max(0, Math.floor(itemCount))
  if (total === 0) {
    return { cancelled: false, claimed: 0 }
  }
  const limit = Math.max(1, Math.min(Math.floor(concurrency), total))
  let nextIndex = 0
  let claimed = 0
  let cancelled = false

  const runWorker = async (): Promise<void> => {
    while (true) {
      if (shouldCancel?.()) {
        cancelled = true
        return
      }
      const index = nextIndex
      nextIndex += 1
      if (index >= total) {
        return
      }
      claimed += 1
      await worker(index)
    }
  }

  const runners: Promise<void>[] = []
  for (let i = 0; i < limit; i += 1) {
    runners.push(runWorker())
  }
  await Promise.all(runners)
  if (shouldCancel?.()) {
    cancelled = true
  }
  return { cancelled, claimed }
}
