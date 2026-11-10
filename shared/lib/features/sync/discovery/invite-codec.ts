import { base64UrlToBytes, bytesToBase64Url, utf8Decode, utf8Encode } from "../crypto/bytes.ts"
import { parseSeedB64 } from "../crypto/family-crypto.ts"
import type { SyncInviteV1 } from "../types.ts"

const INVITE_PREFIX = "bmxt1."

function isInviteV1(value: unknown): value is SyncInviteV1 {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    o.version === 1 &&
    typeof o.familyId === "string" &&
    typeof o.seedB64 === "string" &&
    parseSeedB64(o.seedB64) !== null &&
    typeof o.fromDeviceId === "string" &&
    typeof o.fromDisplayName === "string"
  )
}

export function formatInvite(invite: SyncInviteV1): string {
  const json = JSON.stringify(invite)
  return INVITE_PREFIX + bytesToBase64Url(utf8Encode(json))
}

/** EN: Strip whitespace so terminal-wrapped paste still parses. */
export function compactInviteToken(raw: string): string {
  return raw.replace(/\s+/g, "")
}

export function parseInvite(raw: string): SyncInviteV1 | null {
  const trimmed = compactInviteToken(raw)
  if (!trimmed.startsWith(INVITE_PREFIX)) {
    return null
  }
  const body = trimmed.slice(INVITE_PREFIX.length)
  const bytes = base64UrlToBytes(body)
  if (bytes === null) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(utf8Decode(bytes))
    if (!isInviteV1(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** EN: Same as formatInvite — QR payload is the invite string (no network). */
export function formatInviteQrPayload(invite: SyncInviteV1): string {
  return formatInvite(invite)
}
