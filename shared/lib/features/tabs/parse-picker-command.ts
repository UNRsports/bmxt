import type { BulkSubMode } from "./tab-picker-overlay-types"

export type ParsedPickerCommand =
  | { kind: "bulk"; mode: BulkSubMode; closeAfter: boolean }
  | { kind: "nohlsearch" }
  | { kind: "unknown" }

const ALIASES: Record<string, BulkSubMode> = {
  // EN: `move` has no short alias (`m` removed). Other legacy shorts remain for now.
  move: "move",
  c: "close",
  close: "close",
  g: "group",
  group: "group",
  nw: "newWindow",
  newwindow: "newWindow",
  nt: "newTab",
  newtab: "newTab",
  reload: "reload"
}

/**
 * EN: Parse `:` command buffer (`move`, `move --close`, `nohlsearch`, …).
 * JA: `:` コマンドバッファを解釈する。
 */
export function parsePickerCommand(buffer: string): ParsedPickerCommand {
  const parts = buffer.trim().toLowerCase().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) {
    return { kind: "unknown" }
  }
  if (parts[0] === "nohlsearch" || parts[0] === "noh") {
    return { kind: "nohlsearch" }
  }
  // EN: edit has no short alias (matches prior README contract).
  if (parts[0] === "edit") {
    if (parts.length !== 1) {
      return { kind: "unknown" }
    }
    return { kind: "bulk", mode: "edit", closeAfter: false }
  }
  const mode = ALIASES[parts[0]!]
  if (mode === undefined) {
    return { kind: "unknown" }
  }
  let closeAfter = false
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i] === "--close") {
      if (mode !== "move") {
        return { kind: "unknown" }
      }
      closeAfter = true
      continue
    }
    return { kind: "unknown" }
  }
  return { kind: "bulk", mode, closeAfter }
}
