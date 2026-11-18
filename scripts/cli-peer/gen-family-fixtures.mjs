/**
 * EN: Generate Family seal fixtures matching shared/lib/features/sync/crypto/family-crypto.ts.
 * JA: family-crypto.ts と同じ封印アルゴリズムでフィクスチャを生成する。
 *
 * Usage: node scripts/cli-peer/gen-family-fixtures.mjs
 */
import { hkdfSync, createCipheriv, createDecipheriv } from "node:crypto"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "../..")
const OUT_DIRS = [
  join(ROOT, "_context/cli-peer/fixtures"),
  join(ROOT, "shared/crates/bmxt-family/tests/fixtures")
]

const HKDF_INFO = Buffer.from("bmxt-family-sync-v1", "utf8")
const B64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlToBytes(raw) {
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4)
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(b64, "base64")
}

/** Deterministic seed/iv for committed fixtures (not for production). */
const SEED = Buffer.from(
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "hex"
)
const IV = Buffer.from("00112233445566778899aabb", "hex")
const FAMILY_ID = bytesToBase64Url(Buffer.from("family-id-16byte!", "utf8"))
const FROM_DEVICE = bytesToBase64Url(Buffer.from("device-aaa-bytes!", "utf8"))
const TO_DEVICE = "*"

const plain = {
  v: 1,
  role: "offer",
  sessionId: "sessABCDEF12",
  fromDeviceId: FROM_DEVICE,
  fromDisplayName: "terminal@sessAB",
  familyId: FAMILY_ID,
  sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
  ice: ['{"candidate":"candidate:1 1 udp 1 127.0.0.1 9 typ host","sdpMid":"0","sdpMLineIndex":0}']
}

const now = Date.parse("2026-01-15T12:00:00.000Z")
const ttlMs = 30 * 60 * 1000

const key = hkdfSync("sha256", SEED, Buffer.alloc(0), HKDF_INFO, 32)
const cipher = createCipheriv("aes-256-gcm", key, IV)
const ciphertext = Buffer.concat([
  cipher.update(Buffer.from(JSON.stringify(plain), "utf8")),
  cipher.final(),
  cipher.getAuthTag()
])

const envelope = {
  version: 1,
  familyId: FAMILY_ID,
  fromDeviceId: FROM_DEVICE,
  toDeviceId: TO_DEVICE,
  kind: "signal",
  createdAt: new Date(now).toISOString(),
  expiresAt: new Date(now + ttlMs).toISOString(),
  ciphertextB64: bytesToBase64Url(ciphertext),
  ivB64: bytesToBase64Url(IV)
}

const handshakeCode = `bmxt-rtc1.${bytesToBase64Url(Buffer.from(JSON.stringify(envelope), "utf8"))}`

const sealedDoc = {
  seedB64: bytesToBase64Url(SEED),
  familyId: FAMILY_ID,
  fromDeviceId: FROM_DEVICE,
  envelope,
  plain,
  handshakeCode
}

const ping = {
  type: "ping",
  id: "ping-fixture-001",
  from: FROM_DEVICE,
  at: now
}

const ack = {
  type: "ack",
  id: "ack-fixture-001",
  replyTo: "ping-fixture-001",
  from: FROM_DEVICE,
  at: now + 12
}

const invite = {
  version: 1,
  familyId: FAMILY_ID,
  seedB64: bytesToBase64Url(SEED),
  fromDeviceId: FROM_DEVICE,
  fromDisplayName: "terminal@sessAB"
}
const inviteCode = `bmxt1.${bytesToBase64Url(Buffer.from(JSON.stringify(invite), "utf8"))}`

for (const dir of OUT_DIRS) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "sealed-handshake.json"), `${JSON.stringify(sealedDoc, null, 2)}\n`)
  writeFileSync(join(dir, "ping.json"), `${JSON.stringify(ping, null, 2)}\n`)
  writeFileSync(join(dir, "ack.json"), `${JSON.stringify(ack, null, 2)}\n`)
  writeFileSync(
    join(dir, "invite.json"),
    `${JSON.stringify({ invite, inviteCode }, null, 2)}\n`
  )
}

// Sanity: decrypt must recover plain
const decipher = createDecipheriv("aes-256-gcm", key, IV)
const tag = ciphertext.subarray(ciphertext.length - 16)
const body = ciphertext.subarray(0, ciphertext.length - 16)
decipher.setAuthTag(tag)
const recovered = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")
if (recovered !== JSON.stringify(plain)) {
  throw new Error("fixture self-check failed")
}

void base64UrlToBytes

console.log("Wrote fixtures to:")
for (const dir of OUT_DIRS) {
  console.log(`  ${dir}`)
}
