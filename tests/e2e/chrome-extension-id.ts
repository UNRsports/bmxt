/**
 * EN: Chromium unpacked extension ID from absolute path (SHA-256 → a–p alphabet).
 * JA: アンパック拡張の ID を絶対パスから算出（SHA-256 → a–p）。
 */

import { createHash } from "node:crypto"
import { realpathSync } from "node:fs"

export function chromeExtensionIdFromPath(extensionPath: string): string {
  const absolute = realpathSync(extensionPath)
  const digest = createHash("sha256").update(absolute, "utf8").digest()
  let id = ""
  for (let i = 0; i < 16; i += 1) {
    const byte = digest[i]!
    id += String.fromCharCode(97 + (byte >> 4))
    id += String.fromCharCode(97 + (byte & 0x0f))
  }
  return id
}
