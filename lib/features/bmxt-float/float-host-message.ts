/**
 * EN: SW ↔ content-script messages for the in-page float prompt host.
 * JA: サイト上フロート・プロンプト用の SW ↔ CS メッセージ。
 */

export const BMXT_FLOAT_MESSAGE_TYPE = "TOGGLE_BMXT_FLOAT" as const

export type BmxtFloatHostAction = "toggle" | "show" | "hide"

export type BmxtFloatHostRequest = {
  type: typeof BMXT_FLOAT_MESSAGE_TYPE
  action?: BmxtFloatHostAction
}

export type BmxtFloatHostResponse = {
  ok: true
  visible: boolean
} | {
  ok: false
  reason: string
}

export function isBmxtFloatHostRequest(message: unknown): message is BmxtFloatHostRequest {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as { type?: string; action?: unknown }
  if (typed.type !== BMXT_FLOAT_MESSAGE_TYPE) {
    return false
  }
  if (typed.action === undefined) {
    return true
  }
  return typed.action === "toggle" || typed.action === "show" || typed.action === "hide"
}
