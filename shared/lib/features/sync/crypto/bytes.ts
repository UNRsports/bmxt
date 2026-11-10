/** EN: Base64url helpers (no padding) for invite / envelope fields. */

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64")
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function base64UrlToBytes(raw: string): Uint8Array | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  for (let i = 0; i < trimmed.length; i += 1) {
    if (!B64_ALPHABET.includes(trimmed[i]!)) {
      return null
    }
  }
  const padded = trimmed + "=".repeat((4 - (trimmed.length % 4)) % 4)
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/")
  try {
    const binary =
      typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("binary")
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  } catch {
    return null
  }
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  crypto.getRandomValues(out)
  return out
}
