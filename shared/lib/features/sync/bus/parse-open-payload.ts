/**
 * EN: Parse `tab -send` / SyncOpen trailing payload (`urls… [--group title] [--close]`).
 * JA: `tab -send` / SyncOpen の trailing payload を解釈する。
 */

export type ParsedOpenPayload = {
  urls: string[]
  groupTitle: string | null
  closeAfter: boolean
}

export function parseOpenPayload(payload: string): ParsedOpenPayload {
  const parts = payload.trim().split(/\s+/).filter((p) => p.length > 0)
  let groupTitle: string | null = null
  let closeAfter = false
  const urls: string[] = []
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!
    if (part === "--group" && i + 1 < parts.length) {
      groupTitle = parts[i + 1]!
      i += 1
      continue
    }
    if (part === "--close") {
      closeAfter = true
      continue
    }
    urls.push(part)
  }
  return { urls, groupTitle, closeAfter }
}
