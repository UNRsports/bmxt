/**
 * EN: Pipe RHS consumer classification via WASM (Rust SoT).
 * JA: パイプ右辺コンシューマ分類は WASM（Rust SoT）。
 */

import { wasmClassifyPipeConsumer } from "../../../bmxt-core/wasm-host.ts"

export type OpenPipeMode = "new_tab" | "new_window" | "into_window" | "into_group"

export type BookmarkSendMode = "open" | "save" | "both"

export type PipeConsumerClass =
  | { id: "browse" }
  | { id: "close" }
  | { id: "back" }
  | { id: "forward" }
  | { id: "reload" }
  | { id: "jump" }
  | { id: "new-window" }
  | { id: "tab-send"; deviceId: string; closeAfter: boolean }
  | {
      id: "open"
      mode: OpenPipeMode
      windowId?: number
      groupId?: number
    }
  | { id: "move"; windowId: number; groupId: number; ungroup: boolean }
  | { id: "bookmark-remove" }
  | { id: "bookmark-move"; parentId: string; index: number | null }
  | { id: "bookmark-send"; deviceId: string; mode: BookmarkSendMode; parentId: string | null; groupTitle: string | null }
  | { id: "history-delete" }

const KNOWN_IDS = new Set([
  "browse",
  "close",
  "back",
  "forward",
  "reload",
  "jump",
  "new-window",
  "tab-send",
  "open",
  "move",
  "bookmark-remove",
  "bookmark-move",
  "bookmark-send",
  "history-delete"
])

function isOpenMode(value: unknown): value is OpenPipeMode {
  return (
    value === "new_tab" ||
    value === "new_window" ||
    value === "into_window" ||
    value === "into_group"
  )
}

function parseClass(raw: unknown): PipeConsumerClass | null {
  if (raw === null || typeof raw !== "object") {
    return null
  }
  const o = raw as Record<string, unknown>
  const id = o.id
  if (typeof id !== "string" || !KNOWN_IDS.has(id)) {
    return null
  }
  switch (id) {
    case "browse":
    case "close":
    case "back":
    case "forward":
    case "reload":
    case "jump":
    case "new-window":
      return { id }
    case "tab-send": {
      if (typeof o.deviceId !== "string" || typeof o.closeAfter !== "boolean") {
        return null
      }
      return { id: "tab-send", deviceId: o.deviceId, closeAfter: o.closeAfter }
    }
    case "open": {
      if (!isOpenMode(o.mode)) {
        return null
      }
      return {
        id: "open",
        mode: o.mode,
        ...(typeof o.windowId === "number" ? { windowId: o.windowId } : {}),
        ...(typeof o.groupId === "number" ? { groupId: o.groupId } : {})
      }
    }
    case "move": {
      if (
        typeof o.windowId !== "number" ||
        typeof o.groupId !== "number" ||
        typeof o.ungroup !== "boolean"
      ) {
        return null
      }
      return {
        id: "move",
        windowId: o.windowId,
        groupId: o.groupId,
        ungroup: o.ungroup
      }
    }
    case "bookmark-remove":
      return { id: "bookmark-remove" }
    case "bookmark-move": {
      if (typeof o.parentId !== "string") {
        return null
      }
      const index = typeof o.index === "number" ? o.index : null
      return { id: "bookmark-move", parentId: o.parentId, index }
    }
    case "bookmark-send": {
      if (typeof o.deviceId !== "string") {
        return null
      }
      const mode: BookmarkSendMode =
        o.mode === "save" ? "save" : o.mode === "both" ? "both" : "open"
      const parentId = typeof o.parentId === "string" ? o.parentId : null
      const groupTitle = typeof o.groupTitle === "string" ? o.groupTitle : null
      return { id: "bookmark-send", deviceId: o.deviceId, mode, parentId, groupTitle }
    }
    case "history-delete":
      return { id: "history-delete" }
    default:
      return null
  }
}

/**
 * EN: TS fallback parser for pipe consumers not yet in WASM (new in Phase 9).
 * JA: WASM 未実装の新コンシューマ向け TS フォールバックパーサ。
 */
function parseTsFallbackConsumer(segment: string): PipeConsumerClass | null {
  const parts = segment
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)
  if (parts.length === 0) {
    return null
  }
  const first = parts[0]!.toLowerCase()

  // bookmark -remove (bare)
  if (first === "bookmark" && parts.length === 2 && parts[1] === "-remove") {
    return { id: "bookmark-remove" }
  }

  // bookmark -move --parent <id> [--index n]
  if (first === "bookmark" && parts.length >= 4 && parts[1] === "-move") {
    let parentId: string | null = null
    let index: number | null = null
    for (let i = 2; i < parts.length; i++) {
      if (parts[i] === "--parent" && parts[i + 1] !== undefined) {
        parentId = parts[i + 1]!
        i++
      } else if (parts[i] === "--index" && parts[i + 1] !== undefined) {
        const n = Number.parseInt(parts[i + 1]!, 10)
        if (Number.isFinite(n) && n >= 0) {
          index = n
        }
        i++
      } else {
        return null
      }
    }
    if (parentId === null || parentId.length === 0) {
      return null
    }
    return { id: "bookmark-move", parentId, index }
  }

  // bookmark -send <deviceId> [--open|--save|--both] [--parent <id>] [--group <title...>]
  if (first === "bookmark" && parts.length >= 3 && parts[1] === "-send") {
    const deviceId = parts[2]!
    if (deviceId.startsWith("-")) {
      return null
    }
    let mode: BookmarkSendMode = "open"
    let parentId: string | null = null
    let groupTitle: string | null = null
    for (let i = 3; i < parts.length; i++) {
      if (parts[i] === "--open") {
        mode = "open"
      } else if (parts[i] === "--save") {
        mode = "save"
      } else if (parts[i] === "--both") {
        mode = "both"
      } else if (parts[i] === "--parent" && parts[i + 1] !== undefined) {
        parentId = parts[i + 1]!
        i++
      } else if (parts[i] === "--group" && parts[i + 1] !== undefined) {
        // EN: Collect remaining tokens as group title.
        groupTitle = parts.slice(i + 1).join(" ")
        break
      } else {
        return null
      }
    }
    return { id: "bookmark-send", deviceId, mode, parentId, groupTitle }
  }

  // history -delete (bare)
  if (first === "history" && parts.length === 2 && parts[1] === "-delete") {
    return { id: "history-delete" }
  }

  return null
}

/**
 * EN: Classify a pipe RHS segment (requires `ensureBmxtCore` / test helper).
 *     Falls back to a TS parser for Phase 9 consumers not yet in WASM.
 * JA: パイプ右辺を分類する（`ensureBmxtCore` / テストヘルパ必須）。
 *     WASM 未実装の Phase 9 コンシューマには TS フォールバックを使う。
 */
export function classifyPipeConsumer(segment: string): PipeConsumerClass | null {
  const raw = wasmClassifyPipeConsumer(segment)
  if (raw !== "null" && raw.length > 0) {
    try {
      const parsed = parseClass(JSON.parse(raw) as unknown)
      if (parsed !== null) {
        return parsed
      }
    } catch {
      // fall through to TS fallback
    }
  }
  return parseTsFallbackConsumer(segment)
}

export function pipeConsumerId(segment: string): string | null {
  const classified = classifyPipeConsumer(segment)
  return classified === null ? null : classified.id
}
