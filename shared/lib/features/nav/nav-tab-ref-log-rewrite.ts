/**
 * EN: Rewrite `#t:<id>` in log echo / plain lines to inline favicon+title chips.
 * Chip-only / `tab:` / `tab::` producer echoes keep the command prefix; wire ids never surface.
 */

import { encodeTabRefInline } from "../command-line/tab-ref-log.ts"
import { isTabChipTriggerToken } from "./tab-chip-token.ts"
import {
  parseNavReloadTabToken,
  type NavReloadTabChipMeta
} from "./nav-reload-tab-token.ts"

const HASH_T_TOKEN_RE = /#t:(\d+)/g

function encodeChipRef(
  tabId: number,
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string,
  includeUrl: boolean
): string {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return encodeTabRefInline({
      title: pendingTitle,
      faviconSrc: null,
      appearance: "chip",
      url: null
    })
  }
  const meta = metaById.get(tabId)
  const title = meta?.title?.trim() || pendingTitle
  const url = includeUrl ? meta?.url?.trim() || null : null
  return encodeTabRefInline({
    title,
    faviconSrc: meta?.faviconSrc ?? null,
    appearance: "chip",
    url
  })
}

/**
 * EN: Chip-only command echo (`#t:…` / `tab: #t:…` / `tab:: #t:…`) → `tab:` / `tab::` + chips.
 * Returns null when the body is not a pure chip producer (e.g. `reload #t:1`).
 */
function tryRewriteChipCommandEcho(
  text: string,
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string
): string | null {
  let promptPrefix = ""
  let body = text
  if (/^>/.test(text)) {
    const promptMatch = /^(>\s*)([\s\S]*)$/.exec(text)
    if (promptMatch === null) {
      return null
    }
    promptPrefix = promptMatch[1] ?? ""
    body = (promptMatch[2] ?? "").trim()
  } else {
    body = text.trim()
  }
  if (body.length === 0 || !body.includes("#t:")) {
    return null
  }

  const tokens = body.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return null
  }

  let mode: "title" | "url" = "title"
  let index = 0
  const first = tokens[0]!
  if (/^tab::/i.test(first) && isTabChipTriggerToken(first)) {
    mode = "url"
    index = 1
  } else if (/^tab:/i.test(first) && isTabChipTriggerToken(first)) {
    mode = "title"
    index = 1
  }

  const chipIds: number[] = []
  for (; index < tokens.length; index += 1) {
    const tok = tokens[index]!
    const tabId = parseNavReloadTabToken(tok)
    if (tabId !== null) {
      chipIds.push(tabId)
      continue
    }
    if (isTabChipTriggerToken(tok)) {
      continue
    }
    return null
  }

  if (chipIds.length === 0) {
    return null
  }

  const commandPrefix = mode === "url" ? "tab::" : "tab:"
  const includeUrl = mode === "url"
  const chipParts = chipIds.map((id) =>
    encodeChipRef(id, metaById, pendingTitle, includeUrl)
  )
  return `${promptPrefix}${commandPrefix} ${chipParts.join(" ")}`
}

export function rewriteHashTTokensForLog(
  text: string,
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string
): string {
  if (!text.includes("#t:")) {
    return text
  }

  const chipCommand = tryRewriteChipCommandEcho(text, metaById, pendingTitle)
  if (chipCommand !== null) {
    return chipCommand
  }

  return text.replace(HASH_T_TOKEN_RE, (_match, idStr: string) => {
    const tabId = Number(idStr)
    return encodeChipRef(tabId, metaById, pendingTitle, false)
  })
}

export function rewriteHashTTokensInLogLines(
  lines: readonly string[],
  metaById: ReadonlyMap<number, NavReloadTabChipMeta>,
  pendingTitle: string
): string[] {
  return lines.map((line) => rewriteHashTTokensForLog(line, metaById, pendingTitle))
}
