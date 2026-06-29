/** EN: Shared j/k and arrow direction for side-column pickers. */
/** JA: サイド列ピッカー共通の j/k・矢印の縦移動判定。 */

/** `j`/`k` と矢印の共通方向（Ctrl+Shift や Shift+範囲は物理矢印のみ） */
export function verticalNavDirection(
  e: Pick<KeyboardEvent, "key" | "code">
): "up" | "down" | null {
  const k = e.key
  if (k === "ArrowDown" || k === "j" || k === "J") {
    return "down"
  }
  if (k === "ArrowUp" || k === "k" || k === "K") {
    return "up"
  }
  if (e.code === "ArrowDown") {
    return "down"
  }
  if (e.code === "ArrowUp") {
    return "up"
  }
  return null
}

/** 物理 ↑↓ のみ（tabs ピッカーなど j/k 非対応の列用） */
export function physicalArrowVerticalNavDirection(
  e: Pick<KeyboardEvent, "key" | "code">
): "up" | "down" | null {
  if (e.key === "ArrowDown" || e.code === "ArrowDown") {
    return "down"
  }
  if (e.key === "ArrowUp" || e.code === "ArrowUp") {
    return "up"
  }
  return null
}

export function isJkVerticalNavKey(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return verticalNavDirection(e) !== null && physicalArrowVerticalNavDirection(e) === null
}

export function isPhysicalArrowDown(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowDown" || e.code === "ArrowDown"
}

export function isPhysicalArrowUp(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowUp" || e.code === "ArrowUp"
}

/**
 * Ctrl/Meta + 物理 ↑↓（Shift なし）。split ペイン間移動用のためピッカー縦ナビでは扱わない。
 * Ctrl+Shift+↑↓（プレビュー用）は shift ありのためここに該当しない。
 */
export function isReservedSplitPaneVerticalNav(
  e: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code">
): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    !e.shiftKey &&
    (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
  )
}
