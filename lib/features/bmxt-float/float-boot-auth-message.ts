/**
 * EN: Float page → SW boot authorization (WAR embed gate).
 * JA: フロートページ → SW の起動認可（WAR 埋め込みゲート）。
 */

export const BMXT_FLOAT_BOOT_AUTH_TYPE = "BMXT_FLOAT_BOOT_AUTH" as const

export type BmxtFloatBootAuthRequest = {
  type: typeof BMXT_FLOAT_BOOT_AUTH_TYPE
  tabId: number
  /** EN: `location.ancestorOrigins[0]` — null when top-level or unavailable. */
  parentOrigin: string | null
}

export type BmxtFloatBootAuthResponse = {
  ok: boolean
}

export function isBmxtFloatBootAuthRequest(raw: unknown): raw is BmxtFloatBootAuthRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const typed = raw as {
    type?: unknown
    tabId?: unknown
    parentOrigin?: unknown
  }
  if (typed.type !== BMXT_FLOAT_BOOT_AUTH_TYPE) {
    return false
  }
  if (typeof typed.tabId !== "number" || !Number.isInteger(typed.tabId) || typed.tabId < 0) {
    return false
  }
  if (typed.parentOrigin !== null && typeof typed.parentOrigin !== "string") {
    return false
  }
  return true
}

export function readFloatParentOriginFromAncestors(
  ancestorOrigins: DOMStringList | undefined
): string | null {
  if (!ancestorOrigins || ancestorOrigins.length < 1) {
    return null
  }
  const origin = ancestorOrigins.item(0)
  if (typeof origin !== "string" || origin.length === 0) {
    return null
  }
  return origin
}
