/**
 * EN: Pipe RHS consumer classification via WASM (Rust SoT).
 * JA: パイプ右辺コンシューマ分類は WASM（Rust SoT）。
 */

import { wasmClassifyPipeConsumer } from "../../../bmxt-core/wasm-host.ts"

export type OpenPipeMode = "new_tab" | "new_window" | "into_window" | "into_group"

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
  "move"
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
    default:
      return null
  }
}

/**
 * EN: Classify a pipe RHS segment (requires `ensureBmxtCore` / test helper).
 * JA: パイプ右辺を分類する（`ensureBmxtCore` / テストヘルパ必須）。
 */
export function classifyPipeConsumer(segment: string): PipeConsumerClass | null {
  const raw = wasmClassifyPipeConsumer(segment)
  if (raw === "null" || raw.length === 0) {
    return null
  }
  try {
    return parseClass(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function pipeConsumerId(segment: string): string | null {
  const classified = classifyPipeConsumer(segment)
  return classified === null ? null : classified.id
}
