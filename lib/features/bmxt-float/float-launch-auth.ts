/**
 * EN: Authorize float page boots so WAR embeds from foreign origins cannot start BMXt UI.
 *     Minted by the SW before show/toggle; float validates tabId + parent frame origin.
 * JA: WAR 無断埋め込みでフロート UI が起動しないよう認可する。
 *     show/toggle 前に SW が mint し、起動時に tabId + 親 origin を照合する。
 */

import { FLOAT_LAUNCH_AUTH_KEY } from "../extension-storage/keys.ts"

const AUTH_TTL_MS = 15 * 60 * 1000

export type FloatLaunchAuthEntry = {
  parentOrigin: string
  exp: number
}

type AuthBag = Record<string, FloatLaunchAuthEntry>

function tabKey(tabId: number): string {
  return String(tabId)
}

function isHttpOrigin(origin: string): boolean {
  return origin.startsWith("http://") || origin.startsWith("https://")
}

/** EN: Parse http(s) origin from a tab URL (testable). */
export function parentOriginFromTabUrl(url: string | undefined): string | null {
  if (!url) {
    return null
  }
  try {
    const origin = new URL(url).origin
    if (!isHttpOrigin(origin)) {
      return null
    }
    return origin
  } catch {
    return null
  }
}

/** EN: True when boot parentOrigin matches a non-expired mint (testable). */
export function matchesFloatLaunchAuth(
  entry: FloatLaunchAuthEntry | null | undefined,
  parentOrigin: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!entry || !parentOrigin || parentOrigin.length === 0) {
    return false
  }
  if (!isHttpOrigin(parentOrigin)) {
    return false
  }
  if (nowMs > entry.exp) {
    return false
  }
  return entry.parentOrigin === parentOrigin
}

async function readAuthBag(): Promise<AuthBag> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_LAUNCH_AUTH_KEY)
    const bag = raw[FLOAT_LAUNCH_AUTH_KEY]
    if (!bag || typeof bag !== "object") {
      return {}
    }
    return bag as AuthBag
  } catch {
    return {}
  }
}

async function writeAuthBag(bag: AuthBag): Promise<void> {
  try {
    await chrome.storage.session.set({ [FLOAT_LAUNCH_AUTH_KEY]: bag })
  } catch {
    /* ignore */
  }
}

/**
 * EN: Record an expected parent origin for the next float boot on this tab.
 * JA: このタブで次にフロートが起動するときの親 origin を記録する。
 */
export async function mintFloatLaunchAuth(
  tabId: number,
  parentOrigin: string,
  nowMs: number = Date.now()
): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  if (!isHttpOrigin(parentOrigin)) {
    return false
  }
  const bag = await readAuthBag()
  bag[tabKey(tabId)] = {
    parentOrigin,
    exp: nowMs + AUTH_TTL_MS
  }
  await writeAuthBag(bag)
  return true
}

/** EN: Mint from the live tab URL (SW). */
export async function mintFloatLaunchAuthForTab(tabId: number): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  const origin = parentOriginFromTabUrl(tab?.url)
  if (origin === null) {
    return false
  }
  return mintFloatLaunchAuth(tabId, origin)
}

/** EN: Validate a float page boot (extension page → SW). */
export async function validateFloatLaunchBoot(
  tabId: number,
  parentOrigin: string | null
): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  const bag = await readAuthBag()
  return matchesFloatLaunchAuth(bag[tabKey(tabId)], parentOrigin)
}

export async function clearFloatLaunchAuthForTab(tabId: number): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  const bag = await readAuthBag()
  const key = tabKey(tabId)
  if (!(key in bag)) {
    return
  }
  delete bag[key]
  await writeAuthBag(bag)
}
