/**
 * EN: Rewrite `#t:<id>` in log echo / plain lines to inline favicon+title chips.
 */

import { encodeTabRefInline } from "../command-line/tab-ref-log.ts"
import type { NavReloadTabChipMeta } from "./nav-reload-tab-token.ts"

const HASH_T_TOKEN_RE = /#t:(\d+)/g

export function rewriteHashTTokensForLog(
  text: string,
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string
): string {
  if (!text.includes("#t:")) {
    return text
  }
  return text.replace(HASH_T_TOKEN_RE, (_match, idStr: string) => {
    const tabId = Number(idStr)
    if (!Number.isInteger(tabId) || tabId < 0) {
      return encodeTabRefInline({ title: pendingTitle, faviconSrc: null, appearance: "chip" })
    }
    const meta = metaById.get(tabId)
    const title = meta?.title?.trim() || pendingTitle
    return encodeTabRefInline({
      title,
      faviconSrc: meta?.faviconSrc ?? null,
      appearance: "chip"
    })
  })
}

export function rewriteHashTTokensInLogLines(
  lines: readonly string[],
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string
): string[] {
  return lines.map((line) => rewriteHashTTokensForLog(line, metaById, pendingTitle))
}
