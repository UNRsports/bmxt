/**
 * EN: File transport for Family invite tokens (`bmxt1.…`).
 * JA: Family 招待トークン（`bmxt1.…`）のファイル輸送。
 */

import { compactInviteToken } from "../../discovery/invite-codec.ts"
import { formatBmxtTicketStamp } from "./ticket-stamp.ts"

export const FAMILY_INVITE_FILE_KIND = "bmxt-family-invite" as const
export const FAMILY_INVITE_FILE_VERSION = 1 as const

const INVITE_PREFIX = "bmxt1."
const MAX_FILE_CHARS = 16_384
const MAX_INVITE_CHARS = 8_192

export type FamilyInviteFileDocument = {
  v: typeof FAMILY_INVITE_FILE_VERSION
  kind: typeof FAMILY_INVITE_FILE_KIND
  code: string
}

export type FamilyInviteFileParseResult =
  | { ok: true; code: string }
  | { ok: false; reason: "empty" | "tooLarge" | "invalidJson" | "invalidShape" | "invalidCode" }

function extractInviteCode(raw: string): string | null {
  const compact = compactInviteToken(raw)
  const prefixAt = compact.indexOf(INVITE_PREFIX)
  if (prefixAt < 0) {
    return null
  }
  const code = compact.slice(prefixAt)
  if (code.length < 16 || code.length > MAX_INVITE_CHARS) {
    return null
  }
  return code
}

/**
 * EN: Example: `bmxt-20261117-114200-invite.json`
 * JA: 例: `bmxt-20261117-114200-invite.json`
 */
export function familyInviteFileName(now: Date = new Date()): string {
  return `bmxt-${formatBmxtTicketStamp(now)}-invite.json`
}

export function buildFamilyInviteFileDocument(args: {
  code: string
}): FamilyInviteFileDocument | null {
  const code = extractInviteCode(args.code)
  if (code === null) {
    return null
  }
  return {
    v: FAMILY_INVITE_FILE_VERSION,
    kind: FAMILY_INVITE_FILE_KIND,
    code
  }
}

export function buildFamilyInviteFileJson(args: { code: string }): string | null {
  const doc = buildFamilyInviteFileDocument(args)
  if (doc === null) {
    return null
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function parseFamilyInviteFileText(raw: string): FamilyInviteFileParseResult {
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
    if (o.v !== FAMILY_INVITE_FILE_VERSION) {
      return { ok: false, reason: "invalidShape" }
    }
    if (o.kind !== FAMILY_INVITE_FILE_KIND) {
      return { ok: false, reason: "invalidShape" }
    }
    if (typeof o.code !== "string") {
      return { ok: false, reason: "invalidShape" }
    }
    const code = extractInviteCode(o.code)
    if (code === null) {
      return { ok: false, reason: "invalidCode" }
    }
    return { ok: true, code }
  }

  const bare = extractInviteCode(trimmed)
  if (bare === null) {
    return { ok: false, reason: "invalidCode" }
  }
  return { ok: true, code: bare }
}

export function downloadFamilyInviteFile(args: {
  code: string
  now?: Date
}): string | null {
  const json = buildFamilyInviteFileJson(args)
  if (json === null) {
    return null
  }
  if (typeof document === "undefined") {
    return null
  }
  const filename = familyInviteFileName(args.now)
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
