/**
 * マルチペイン split の永続化レイアウト（BMXt 専用）。
 * `row` = 上/下（flex column）、`col` = 左/右（flex row）。
 */

export type SplitDir = "row" | "col"

export type LayoutNode =
  | { type: "leaf"; paneId: string }
  | {
      type: "split"
      dir: SplitDir
      /** 0..1 第1子（上/左）の割合 */
      ratio: number
      a: LayoutNode
      b: LayoutNode
    }

export type SplitSessionV1 = {
  v: 1
  root: LayoutNode
  /** 各ペインのセッションログ */
  paneLogs: Record<string, string[]>
  /** キーボードフォーカス中のペイン */
  focusedPaneId: string
}
