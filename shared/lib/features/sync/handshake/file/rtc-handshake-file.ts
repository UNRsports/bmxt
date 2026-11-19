/**
 * EN: File transport for Family-authenticated RTC connection codes (offer / answer).
 *     Clipboard remains the primary path; this is an optional Save / Open alternative.
 * JA: Family 認証付き RTC 接続コード（offer / answer）のファイル輸送。
 *     clipboard 本線に加え、任意の保存／読み込み手段。
 */

import {
  compactRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../common/rtc-handshake-codec.ts"
import { formatBmxtTicketStamp, formatRtcHandshakeFileStamp } from "./ticket-stamp.ts"

export { formatRtcHandshakeFileStamp }

export const RTC_HANDSHAKE_FILE_KIND = "bmxt-rtc-handshake" as const
export const RTC_HANDSHAKE_FILE_VERSION = 1 as const

const MAX_FILE_CHARS = 64_000
const MAX_CODE_CHARS = 48_000

export type RtcHandshakeFileRole = "offer" | "answer"

export type RtcHandshakeFileDocument = {
  v: typeof RTC_HANDSHAKE_FILE_VERSION
  kind: typeof RTC_HANDSHAKE_FILE_KIND
  role: RtcHandshakeFileRole
  code: string
}

export type RtcHandshakeFileParseResult =
  | {
      ok: true
      code: string
      /** EN: Present for structured JSON files; null when the body was a bare code. */
      role: RtcHandshakeFileRole | null
    }
  | { ok: false; reason: "empty" | "tooLarge" | "invalidJson" | "invalidShape" | "invalidCode" }

function isRole(value: unknown): value is RtcHandshakeFileRole {
  return value === "offer" || value === "answer"
}

/**
 * EN: Extract a bare bmxt-rtc1. code from user text (JSON wrapper or pasted code).
 * JA: ユーザー入力（JSON ラッパまたは素のコード）から bmxt-rtc1. を取り出す。
 */
function extractHandshakeCode(raw: string): string | null {
  const compact = compactRtcHandshakeCode(raw)
  const prefixAt = compact.indexOf(RTC_HANDSHAKE_PREFIX)
  if (prefixAt < 0) {
    return null
  }
  const code = compact.slice(prefixAt)
  if (code.length < 16 || code.length > MAX_CODE_CHARS) {
    return null
  }
  return code
}

/**
 * EN: Ticket filename — timestamp before role so Downloads sorts chronologically.
 *     Example: `bmxt-20261117-114200-offer.json`
 * JA: チケットファイル名。時刻を role より前に置き Downloads で時系列整列しやすくする。
 */
export function rtcHandshakeFileName(
  role: RtcHandshakeFileRole,
  now: Date = new Date()
): string {
  return `bmxt-${formatBmxtTicketStamp(now)}-${role}.json`
}

export function buildRtcHandshakeFileDocument(args: {
  role: RtcHandshakeFileRole
  code: string
}): RtcHandshakeFileDocument | null {
  const code = extractHandshakeCode(args.code)
  if (code === null) {
    return null
  }
  return {
    v: RTC_HANDSHAKE_FILE_VERSION,
    kind: RTC_HANDSHAKE_FILE_KIND,
    role: args.role,
    code
  }
}

export function buildRtcHandshakeFileJson(args: {
  role: RtcHandshakeFileRole
  code: string
}): string | null {
  const doc = buildRtcHandshakeFileDocument(args)
  if (doc === null) {
    return null
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function parseRtcHandshakeFileText(raw: string): RtcHandshakeFileParseResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "empty" }
  }
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty" }
  }
  if (trimmed.length > MAX_FILE_CHARS) {
    return { ok: false, reason: "tooLarge" }
  }

  // EN: Prefer structured JSON; fall back to a bare handshake code in the file body.
  // JA: まず構造化 JSON。だめならファイル本体の素の握手コードを試す。
  if (trimmed.startsWith("{")) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      return { ok: false, reason: "invalidJson" }
    }
    if (parsed === null || typeof parsed !== "object") {
      return { ok: false, reason: "invalidShape" }
    }
    const o = parsed as Record<string, unknown>
    if (o.v !== RTC_HANDSHAKE_FILE_VERSION) {
      return { ok: false, reason: "invalidShape" }
    }
    if (o.kind !== RTC_HANDSHAKE_FILE_KIND) {
      return { ok: false, reason: "invalidShape" }
    }
    if (!isRole(o.role)) {
      return { ok: false, reason: "invalidShape" }
    }
    if (typeof o.code !== "string") {
      return { ok: false, reason: "invalidShape" }
    }
    const code = extractHandshakeCode(o.code)
    if (code === null) {
      return { ok: false, reason: "invalidCode" }
    }
    return { ok: true, role: o.role, code }
  }

  const bare = extractHandshakeCode(trimmed)
  if (bare === null) {
    return { ok: false, reason: "invalidCode" }
  }
  return { ok: true, role: null, code: bare }
}

/**
 * EN: Trigger a browser download of the handshake JSON (no downloads permission).
 * JA: 握手 JSON のブラウザダウンロードを起こす（downloads 権限なし）。
 */
export function downloadRtcHandshakeFile(args: {
  role: RtcHandshakeFileRole
  code: string
  now?: Date
}): string | null {
  const json = buildRtcHandshakeFileJson(args)
  if (json === null) {
    return null
  }
  if (typeof document === "undefined") {
    return null
  }
  const filename = rtcHandshakeFileName(args.role, args.now)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return filename
}
