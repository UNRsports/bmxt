/**
 * EN: In-band markers for favicon+title tab refs inside terminal log lines.
 * Wire `#t:<id>` stays out of user-visible log text; refs are decoded at render.
 */

/** EN: `chip` = command-echo block; `plain` = result line (favicon + title only). */
export type TabRefLogAppearance = "chip" | "plain"

export type TabRefLogMeta = {
  title: string
  faviconSrc: string | null
  appearance: TabRefLogAppearance
}

const TAB_REF_PREFIX = "\u001ftab-ref:"
const TAB_REF_SUFFIX = "\u001f"

/** EN: Encode a tab ref for embedding in a log line (e.g. i18n `{tab}`). */
export function encodeTabRefInline(meta: TabRefLogMeta): string {
  const payload: TabRefLogMeta = {
    title: meta.title,
    faviconSrc: meta.faviconSrc,
    appearance: meta.appearance
  }
  return `${TAB_REF_PREFIX}${JSON.stringify(payload)}${TAB_REF_SUFFIX}`
}

export type TabRefLogSegment =
  | { kind: "text"; text: string }
  | { kind: "tabRef"; meta: TabRefLogMeta }

/**
 * EN: Split a log line into plain text and tab-ref segments.
 * Invalid markers are left as plain text.
 */
export function parseTabRefLogSegments(text: string): TabRefLogSegment[] {
  const segments: TabRefLogSegment[] = []
  let cursor = 0
  while (cursor < text.length) {
    const start = text.indexOf(TAB_REF_PREFIX, cursor)
    if (start < 0) {
      const rest = text.slice(cursor)
      if (rest.length > 0) {
        segments.push({ kind: "text", text: rest })
      }
      break
    }
    if (start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, start) })
    }
    const payloadStart = start + TAB_REF_PREFIX.length
    const end = text.indexOf(TAB_REF_SUFFIX, payloadStart)
    if (end < 0) {
      segments.push({ kind: "text", text: text.slice(start) })
      break
    }
    const raw = text.slice(payloadStart, end)
    const meta = tryParseTabRefPayload(raw)
    if (meta === null) {
      segments.push({ kind: "text", text: text.slice(start, end + TAB_REF_SUFFIX.length) })
    } else {
      segments.push({ kind: "tabRef", meta })
    }
    cursor = end + TAB_REF_SUFFIX.length
  }
  return segments
}

function tryParseTabRefPayload(raw: string): TabRefLogMeta | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }
    const record = parsed as Record<string, unknown>
    if (typeof record.title !== "string") {
      return null
    }
    const faviconSrc =
      record.faviconSrc === null
        ? null
        : typeof record.faviconSrc === "string"
          ? record.faviconSrc
          : null
    const appearance: TabRefLogAppearance =
      record.appearance === "chip" ? "chip" : "plain"
    return {
      title: record.title,
      faviconSrc,
      appearance
    }
  } catch {
    return null
  }
}

/** EN: True when the line embeds at least one tab-ref marker. */
export function logLineHasTabRef(text: string): boolean {
  return text.includes(TAB_REF_PREFIX)
}
