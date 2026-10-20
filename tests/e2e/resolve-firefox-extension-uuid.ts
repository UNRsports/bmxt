/**
 * EN: Resolve moz-extension:// UUID for a temporary addon (gecko.id → UUID map).
 * JA: 一時アドオンの moz-extension:// UUID を解決（gecko.id → UUID）。
 */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseUuidMap(raw: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && UUID_RE.test(value)) {
        out[key] = value
      }
    }
    return out
  } catch {
    return null
  }
}

function uuidFromPrefsJs(contents: string, geckoId: string): string | null {
  const match = contents.match(/user_pref\(\s*"extensions\.webextensions\.uuids"\s*,\s*"((?:\\.|[^"\\])*)"\s*\)/)
  if (!match?.[1]) {
    return null
  }
  const unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
  const map = parseUuidMap(unescaped)
  const uuid = map?.[geckoId]
  return typeof uuid === "string" ? uuid : null
}

function uuidFromExtensionsJson(contents: string, geckoId: string): string | null {
  try {
    const parsed: unknown = JSON.parse(contents)
    if (parsed === null || typeof parsed !== "object") {
      return null
    }
    const addons = (parsed as { addons?: unknown }).addons
    if (!Array.isArray(addons)) {
      return null
    }
    for (const entry of addons) {
      if (entry === null || typeof entry !== "object") {
        continue
      }
      const addon = entry as { id?: unknown; rootURI?: unknown; path?: unknown }
      if (addon.id !== geckoId) {
        continue
      }
      if (typeof addon.rootURI === "string") {
        const m = addon.rootURI.match(/^moz-extension:\/\/([^/]+)\//i)
        if (m?.[1] && UUID_RE.test(m[1])) {
          return m[1]
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function collectCandidateFiles(userDataDir: string): string[] {
  const out: string[] = []
  const direct = ["prefs.js", "user.js", "extensions.json"]
  for (const name of direct) {
    const path = join(userDataDir, name)
    if (existsSync(path)) {
      out.push(path)
    }
  }
  // EN: Playwright may nest the real profile one level down.
  try {
    for (const name of readdirSync(userDataDir)) {
      const nested = join(userDataDir, name)
      for (const file of direct) {
        const path = join(nested, file)
        if (existsSync(path)) {
          out.push(path)
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

/** EN: Poll profile files until the gecko.id → UUID mapping appears. */
export async function resolveFirefoxExtensionUuid(
  userDataDir: string,
  geckoId: string,
  timeoutMs = 30_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let lastError = "UUID map not found yet"
  while (Date.now() < deadline) {
    for (const file of collectCandidateFiles(userDataDir)) {
      let contents: string
      try {
        contents = readFileSync(file, "utf8")
      } catch {
        continue
      }
      const fromPrefs =
        file.endsWith("prefs.js") || file.endsWith("user.js")
          ? uuidFromPrefsJs(contents, geckoId)
          : null
      const fromExt = file.endsWith("extensions.json")
        ? uuidFromExtensionsJson(contents, geckoId)
        : null
      const uuid = fromPrefs ?? fromExt
      if (uuid !== null) {
        return uuid
      }
    }
    lastError = `No moz-extension UUID for ${geckoId} under ${userDataDir}`
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(lastError)
}
