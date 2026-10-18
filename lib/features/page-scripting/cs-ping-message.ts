/**
 * EN: Lightweight ping so the SW / extension pages can detect a live content script.
 * JA: 常駐 CS が生きているかを SW / 拡張ページから確認する軽量 ping。
 */

export const BMXT_CS_PING_CHANNEL = "bmxt-cs-ping" as const

export type BmxtCsPingRequest = {
  channel: typeof BMXT_CS_PING_CHANNEL
}

export type BmxtCsPingResponse = {
  ok: true
  extensionId: string
}

export function isBmxtCsPingRequest(raw: unknown): raw is BmxtCsPingRequest {
  if (typeof raw !== "object" || raw === null) {
    return false
  }
  const channel = (raw as { channel?: unknown }).channel
  return channel === BMXT_CS_PING_CHANNEL
}

export function buildBmxtCsPingResponse(): BmxtCsPingResponse {
  return {
    ok: true,
    extensionId: chrome.runtime.id
  }
}
