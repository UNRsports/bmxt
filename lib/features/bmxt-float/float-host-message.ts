/**
 * EN: SW ↔ content-script messages for the in-page float prompt host.
 * JA: サイト上フロート・プロンプト用の SW ↔ CS メッセージ。
 */

import type { FloatGeometryNudgeMode, FloatGeometryArrow } from "./float-geometry.ts"

export const BMXT_FLOAT_MESSAGE_TYPE = "TOGGLE_BMXT_FLOAT" as const

/** EN: CS → SW when × / hide changes visibility without going through float-launch. */
export const BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE = "BMXT_FLOAT_VISIBILITY" as const

/** EN: Float iframe → SW → CS geometry nudge (move / resize). */
export const BMXT_FLOAT_GEOMETRY_MESSAGE_TYPE = "BMXT_FLOAT_GEOMETRY" as const

export type BmxtFloatHostAction = "toggle" | "show" | "hide"

export type BmxtFloatHostRequest = {
  type: typeof BMXT_FLOAT_MESSAGE_TYPE
  action?: BmxtFloatHostAction
  /** EN: Hosting tab id (for iframe `?tabId=` and SW visibility tracking). */
  tabId?: number
}

export type BmxtFloatHostResponse = {
  ok: true
  visible: boolean
} | {
  ok: false
  reason: string
}

export type BmxtFloatVisibilityMessage = {
  type: typeof BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE
  tabId: number
  visible: boolean
  /** EN: When true, drop persisted float sessions for this tab (exit). */
  clearSessions?: boolean
}

export type BmxtFloatGeometryNudgeMessage = {
  type: typeof BMXT_FLOAT_GEOMETRY_MESSAGE_TYPE
  mode: FloatGeometryNudgeMode
  arrow: FloatGeometryArrow
  tabId?: number
}

export type BmxtFloatGeometryResponse = {
  ok: true
} | {
  ok: false
  reason: string
}

export function isBmxtFloatHostRequest(message: unknown): message is BmxtFloatHostRequest {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as { type?: string; action?: unknown; tabId?: unknown }
  if (typed.type !== BMXT_FLOAT_MESSAGE_TYPE) {
    return false
  }
  if (typed.tabId !== undefined) {
    if (typeof typed.tabId !== "number" || !Number.isInteger(typed.tabId)) {
      return false
    }
  }
  if (typed.action === undefined) {
    return true
  }
  return typed.action === "toggle" || typed.action === "show" || typed.action === "hide"
}

export function isBmxtFloatVisibilityMessage(
  message: unknown
): message is BmxtFloatVisibilityMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as {
    type?: string
    tabId?: unknown
    visible?: unknown
    clearSessions?: unknown
  }
  if (typed.type !== BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE) {
    return false
  }
  if (typeof typed.tabId !== "number" || !Number.isInteger(typed.tabId)) {
    return false
  }
  if (typeof typed.visible !== "boolean") {
    return false
  }
  if (typed.clearSessions !== undefined && typeof typed.clearSessions !== "boolean") {
    return false
  }
  return true
}

export function isBmxtFloatGeometryNudgeMessage(
  message: unknown
): message is BmxtFloatGeometryNudgeMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as {
    type?: string
    mode?: unknown
    arrow?: unknown
    tabId?: unknown
  }
  if (typed.type !== BMXT_FLOAT_GEOMETRY_MESSAGE_TYPE) {
    return false
  }
  if (typed.mode !== "move" && typed.mode !== "resize") {
    return false
  }
  if (
    typed.arrow !== "ArrowUp" &&
    typed.arrow !== "ArrowDown" &&
    typed.arrow !== "ArrowLeft" &&
    typed.arrow !== "ArrowRight"
  ) {
    return false
  }
  if (typed.tabId !== undefined) {
    if (typeof typed.tabId !== "number" || !Number.isInteger(typed.tabId)) {
      return false
    }
  }
  return true
}
