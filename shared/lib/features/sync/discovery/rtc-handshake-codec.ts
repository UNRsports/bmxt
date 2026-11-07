import { base64UrlToBytes, bytesToBase64Url, utf8Decode, utf8Encode } from "../crypto/bytes.ts"
import { sealJsonPayload, unsealJsonPayload } from "../crypto/family-crypto.ts"
import type { SyncDeviceId, SyncFamilyId, SyncSealedEnvelope } from "../types.ts"

export const RTC_HANDSHAKE_PREFIX = "bmxt-rtc1."

export type RtcHandshakeRole = "offer" | "answer"

export type RtcHandshakePlain = {
  v: 1
  role: RtcHandshakeRole
  sessionId: string
  fromDeviceId: SyncDeviceId
  fromDisplayName: string
  familyId: SyncFamilyId
  sdp: string
  ice: string[]
}

const MAX_CODE_CHARS = 48_000
const MAX_SDP_CHARS = 32_000
const MAX_ICE = 64
const MAX_ICE_ITEM = 4096

function isHandshakePlain(value: unknown): value is RtcHandshakePlain {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (o.v !== 1) {
    return false
  }
  if (o.role !== "offer" && o.role !== "answer") {
    return false
  }
  if (typeof o.sessionId !== "string" || o.sessionId.length < 8 || o.sessionId.length > 64) {
    return false
  }
  if (typeof o.fromDeviceId !== "string" || o.fromDeviceId.length < 8) {
    return false
  }
  if (typeof o.fromDisplayName !== "string") {
    return false
  }
  if (typeof o.familyId !== "string" || o.familyId.length < 8) {
    return false
  }
  if (typeof o.sdp !== "string" || o.sdp.length === 0 || o.sdp.length > MAX_SDP_CHARS) {
    return false
  }
  if (!Array.isArray(o.ice) || o.ice.length > MAX_ICE) {
    return false
  }
  for (const item of o.ice) {
    if (typeof item !== "string" || item.length === 0 || item.length > MAX_ICE_ITEM) {
      return false
    }
  }
  return true
}

/**
 * EN: Family-seal a WebRTC offer/answer into a copy-pasteable text code (Brave-like).
 * JA: WebRTC offer/answer を Family 封印し、コピペ用テキストコードにする（Brave 風）。
 */
export async function formatRtcHandshakeCode(args: {
  familyId: SyncFamilyId
  seedB64: string
  fromDeviceId: SyncDeviceId
  plain: RtcHandshakePlain
}): Promise<string | null> {
  const envelope = await sealJsonPayload({
    familyId: args.familyId,
    seedB64: args.seedB64,
    fromDeviceId: args.fromDeviceId,
    toDeviceId: "*",
    kind: "signal",
    payload: args.plain,
    ttlMs: 30 * 60 * 1000
  })
  if (envelope === null) {
    return null
  }
  const packed = bytesToBase64Url(utf8Encode(JSON.stringify(envelope)))
  const code = `${RTC_HANDSHAKE_PREFIX}${packed}`
  if (code.length > MAX_CODE_CHARS) {
    return null
  }
  return code
}

/** EN: Strip whitespace so terminal-wrapped paste still parses. */
export function compactRtcHandshakeCode(raw: string): string {
  return raw.replace(/\s+/g, "")
}

export async function parseRtcHandshakeCode(
  raw: string,
  seedB64: string
): Promise<RtcHandshakePlain | null> {
  const trimmed = compactRtcHandshakeCode(raw)
  if (!trimmed.startsWith(RTC_HANDSHAKE_PREFIX)) {
    return null
  }
  if (trimmed.length > MAX_CODE_CHARS) {
    return null
  }
  const body = trimmed.slice(RTC_HANDSHAKE_PREFIX.length)
  if (body.length === 0) {
    return null
  }
  let envelope: SyncSealedEnvelope
  try {
    const json = utf8Decode(base64UrlToBytes(body))
    const parsed: unknown = JSON.parse(json)
    if (parsed === null || typeof parsed !== "object") {
      return null
    }
    const o = parsed as Record<string, unknown>
    if (
      o.version !== 1 ||
      typeof o.familyId !== "string" ||
      typeof o.fromDeviceId !== "string" ||
      typeof o.ciphertextB64 !== "string" ||
      typeof o.ivB64 !== "string"
    ) {
      return null
    }
    envelope = parsed as SyncSealedEnvelope
  } catch {
    return null
  }
  const plain = await unsealJsonPayload<unknown>(envelope, seedB64)
  if (!isHandshakePlain(plain)) {
    return null
  }
  return plain
}
