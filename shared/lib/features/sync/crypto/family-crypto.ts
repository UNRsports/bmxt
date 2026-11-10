import { base64UrlToBytes, bytesToBase64Url, randomBytes, utf8Decode, utf8Encode } from "./bytes.ts"
import type { SyncFamilyId, SyncSealedEnvelope } from "../types.ts"

const HKDF_INFO = utf8Encode("bmxt-family-sync-v1")
const SEED_BYTES = 32
const IV_BYTES = 12

/** EN: Copy into a fresh ArrayBuffer-backed view for Web Crypto BufferSource typing. */
function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

export function generateFamilySeed(): { familyId: SyncFamilyId; seedB64: string } {
  const seed = randomBytes(SEED_BYTES)
  const familyIdBytes = randomBytes(16)
  return {
    familyId: bytesToBase64Url(familyIdBytes),
    seedB64: bytesToBase64Url(seed)
  }
}

export function parseSeedB64(seedB64: string): Uint8Array | null {
  const bytes = base64UrlToBytes(seedB64)
  if (bytes === null || bytes.length !== SEED_BYTES) {
    return null
  }
  return bytes
}

async function deriveAesKey(seed: Uint8Array): Promise<CryptoKey> {
  const seedBuf = asBufferSource(seed)
  const baseKey = await crypto.subtle.importKey("raw", seedBuf, "HKDF", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: asBufferSource(HKDF_INFO)
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function sealJsonPayload(options: {
  familyId: SyncFamilyId
  seedB64: string
  fromDeviceId: string
  toDeviceId: string
  kind: "signal" | "command"
  payload: unknown
  ttlMs: number
  nowMs?: number
}): Promise<SyncSealedEnvelope | null> {
  const seed = parseSeedB64(options.seedB64)
  if (seed === null) {
    return null
  }
  const now = options.nowMs ?? Date.now()
  if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0 || options.ttlMs > 86_400_000) {
    return null
  }
  const key = await deriveAesKey(seed)
  const iv = asBufferSource(randomBytes(IV_BYTES))
  const plain = asBufferSource(utf8Encode(JSON.stringify(options.payload)))
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)
  return {
    version: 1,
    familyId: options.familyId,
    fromDeviceId: options.fromDeviceId,
    toDeviceId: options.toDeviceId,
    kind: options.kind,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + options.ttlMs).toISOString(),
    ciphertextB64: bytesToBase64Url(new Uint8Array(cipherBuf)),
    ivB64: bytesToBase64Url(iv)
  }
}

export async function unsealJsonPayload<T>(
  envelope: SyncSealedEnvelope,
  seedB64: string
): Promise<T | null> {
  const seed = parseSeedB64(seedB64)
  if (seed === null) {
    return null
  }
  const iv = base64UrlToBytes(envelope.ivB64)
  const cipher = base64UrlToBytes(envelope.ciphertextB64)
  if (iv === null || cipher === null || iv.length !== IV_BYTES) {
    return null
  }
  try {
    const key = await deriveAesKey(seed)
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asBufferSource(iv) },
      key,
      asBufferSource(cipher)
    )
    const text = utf8Decode(new Uint8Array(plainBuf))
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function isEnvelopeExpired(envelope: SyncSealedEnvelope, nowMs: number = Date.now()): boolean {
  const exp = Date.parse(envelope.expiresAt)
  if (!Number.isFinite(exp)) {
    return true
  }
  return exp <= nowMs
}
