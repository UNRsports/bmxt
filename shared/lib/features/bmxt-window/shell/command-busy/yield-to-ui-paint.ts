/**
 * EN: Let React commit the busy/locked prompt before heavy Chrome work blocks the UI thread.
 * JA: 重い Chrome 処理の前に、busy／入力ロックの React 描画を一フレーム通す。
 */
export function yieldToUiPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
      return
    }
    setTimeout(resolve, 0)
  })
}
