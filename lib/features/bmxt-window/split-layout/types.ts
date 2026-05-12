/**
 * ターミナル分割（split-col / split-row）。永続化は split-layout-storage。
 */

export type SplitLeaf = { kind: "leaf"; id: string }

export type SplitBranch = {
  kind: "row" | "col"
  /** 0.05–0.95。col: 左の幅比率 / row: 上の高さ比率 */
  ratio: number
  a: SplitNode
  b: SplitNode
}

export type SplitNode = SplitLeaf | SplitBranch

export type SplitLayoutV1 = {
  v: 1
  root: SplitNode
  focusedLeafId: string
}
