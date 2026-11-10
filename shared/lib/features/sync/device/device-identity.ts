import { bytesToBase64Url, randomBytes } from "../crypto/bytes"
import type { SyncBrowserKind, SyncDeviceIdentity } from "../types"
import { SYNC_DEVICE_IDENTITY_KEY } from "../workdir/storage-keys"

const MAX_DISPLAY_NAME_LEN = 64

function detectBrowser(): SyncBrowserKind {
  if (typeof navigator === "undefined") {
    return "unknown"
  }
  const ua = navigator.userAgent
  if (/Firefox\//.test(ua)) {
    return "firefox"
  }
  // EN: Brave before Chrome — UA often still contains Chrome/.
  // JA: Brave を Chrome より先に判定（UA に Chrome/ が残ることが多い）。
  const nav = navigator as Navigator & {
    brave?: { isBrave?: () => Promise<boolean> }
  }
  if (nav.brave !== undefined && typeof nav.brave.isBrave === "function") {
    return "brave"
  }
  if (/Brave/i.test(ua)) {
    return "brave"
  }
  const brands = (
    navigator as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> }
    }
  ).userAgentData?.brands
  if (Array.isArray(brands)) {
    for (const entry of brands) {
      if (typeof entry.brand === "string" && /Brave/i.test(entry.brand)) {
        return "brave"
      }
    }
  }
  if (/Chrome\//.test(ua) || /Chromium\//.test(ua) || /Edg\//.test(ua)) {
    return "chrome"
  }
  return "unknown"
}

function defaultDisplayName(browser: SyncBrowserKind, deviceId: string): string {
  const short = deviceId.slice(0, 6)
  if (browser === "firefox") {
    return `firefox@${short}`
  }
  if (browser === "brave") {
    return `brave@${short}`
  }
  if (browser === "chrome") {
    return `chrome@${short}`
  }
  return `bmxt@${short}`
}

export function sanitizeDisplayName(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME_LEN) {
    return null
  }
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) {
      return null
    }
  }
  return trimmed
}

function isDeviceIdentity(value: unknown): value is SyncDeviceIdentity {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.deviceId === "string" &&
    o.deviceId.length >= 8 &&
    o.deviceId.length <= 64 &&
    typeof o.displayName === "string" &&
    typeof o.browser === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  )
}

export async function loadOrCreateDeviceIdentity(): Promise<SyncDeviceIdentity> {
  const stored = await chrome.storage.local.get(SYNC_DEVICE_IDENTITY_KEY)
  const raw = stored[SYNC_DEVICE_IDENTITY_KEY]
  if (isDeviceIdentity(raw)) {
    return raw
  }
  const now = new Date().toISOString()
  const deviceId = bytesToBase64Url(randomBytes(16))
  const browser = detectBrowser()
  const identity: SyncDeviceIdentity = {
    deviceId,
    displayName: defaultDisplayName(browser, deviceId),
    browser,
    createdAt: now,
    updatedAt: now
  }
  await chrome.storage.local.set({ [SYNC_DEVICE_IDENTITY_KEY]: identity })
  return identity
}

export async function setDeviceDisplayName(name: string): Promise<SyncDeviceIdentity | null> {
  const sanitized = sanitizeDisplayName(name)
  if (sanitized === null) {
    return null
  }
  const current = await loadOrCreateDeviceIdentity()
  const next: SyncDeviceIdentity = {
    ...current,
    displayName: sanitized,
    updatedAt: new Date().toISOString()
  }
  await chrome.storage.local.set({ [SYNC_DEVICE_IDENTITY_KEY]: next })
  return next
}
