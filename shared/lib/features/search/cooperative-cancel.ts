/**
 * EN: Cooperative cancel for long `search` adapter loops.
 *     Yields to the event loop periodically so Ctrl+C can flip the parent job flag.
 * JA: 長い search アダプタ走査向けの協調キャンセル。
 *     親ジョブの Ctrl+C が届くよう、一定間隔でイベントループへ制御を返す。
 */

/** EN: Parent-job cancel probe wired from `DispatchHostContext.shouldCancel`. */
export type SearchShouldCancel = () => boolean

/** EN: Steps between `setTimeout(0)` yields (keeps match loops interruptible). */
export const SEARCH_CANCEL_YIELD_EVERY = 64

/**
 * EN: Returns true when the parent cancel flag is set.
 *     On every `yieldEvery`-th step, yields a macrotask so keydown can run.
 */
export async function pollSearchCancel(
  shouldCancel: SearchShouldCancel | undefined,
  stepIndex: number,
  yieldEvery: number = SEARCH_CANCEL_YIELD_EVERY
): Promise<boolean> {
  if (shouldCancel?.()) {
    return true
  }
  if (yieldEvery > 0 && stepIndex > 0 && stepIndex % yieldEvery === 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    if (shouldCancel?.()) {
      return true
    }
  }
  return false
}
