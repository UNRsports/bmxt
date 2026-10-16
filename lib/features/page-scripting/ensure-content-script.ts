/**
 * EN: Ensure the declared content script is present on a tab without a page reload.
 *     Uses required http(s) host_permissions + chrome.scripting.executeScript({ files }).
 * JA: ページ再読み込みなしで宣言済み CS をタブへ載せる。
 *     必須 http(s) host_permissions と executeScript({ files }) を使う。
 */

import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  BMXT_CS_PING_CHANNEL,
  type BmxtCsPingRequest,
  type BmxtCsPingResponse
} from "./cs-ping-message.ts"

const AFTER_INJECT_SETTLE_MS = 50
const DEFAULT_MATCHES = ["http://*/*", "https://*/*"] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

type ManifestContentScript = {
  matches?: string[]
  js?: string[]
  all_frames?: boolean
  run_at?: string
}

/** EN: Content-script file lists from the packaged manifest (testable). */
export function listManifestContentScriptInjections(
  manifest: chrome.runtime.Manifest
): Array<{ files: string[]; allFrames: boolean; injectImmediately: boolean }> {
  const scripts = (manifest.content_scripts ?? []) as ManifestContentScript[]
  const out: Array<{ files: string[]; allFrames: boolean; injectImmediately: boolean }> = []
  for (const cs of scripts) {
    const files = cs.js
    if (!files || files.length === 0) {
      continue
    }
    out.push({
      files: [...files],
      allFrames: cs.all_frames === true,
      injectImmediately: cs.run_at === "document_start"
    })
  }
  return out
}

/** EN: URL match patterns used to query open tabs for bulk reinject. */
export function listManifestContentScriptMatches(manifest: chrome.runtime.Manifest): string[] {
  const scripts = (manifest.content_scripts ?? []) as ManifestContentScript[]
  const matches = new Set<string>()
  for (const cs of scripts) {
    for (const pattern of cs.matches ?? []) {
      if (typeof pattern === "string" && pattern.length > 0) {
        matches.add(pattern)
      }
    }
  }
  if (matches.size === 0) {
    for (const pattern of DEFAULT_MATCHES) {
      matches.add(pattern)
    }
  }
  return [...matches]
}

export async function probeContentScript(tabId: number): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  try {
    const response = await chrome.tabs.sendMessage<BmxtCsPingRequest, BmxtCsPingResponse>(tabId, {
      channel: BMXT_CS_PING_CHANNEL
    })
    return Boolean(response?.ok === true && response.extensionId === chrome.runtime.id)
  } catch {
    return false
  }
}

export async function injectManifestContentScripts(tabId: number): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  const injections = listManifestContentScriptInjections(chrome.runtime.getManifest())
  if (injections.length === 0) {
    return false
  }
  let anyOk = false
  for (const injection of injections) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: injection.allFrames },
        files: injection.files,
        injectImmediately: injection.injectImmediately
      })
      anyOk = true
    } catch {
      /* discarded, restricted, or race — caller may fall back */
    }
  }
  return anyOk
}

/**
 * EN: Probe, then inject manifest CS files if missing, then probe again.
 * JA: 未注入なら manifest CS を注入し、再度 ping で確認する。
 */
export async function ensurePageContentScript(tabId: number): Promise<boolean> {
  if (await probeContentScript(tabId)) {
    return true
  }
  const injected = await injectManifestContentScripts(tabId)
  if (!injected) {
    return false
  }
  await sleep(AFTER_INJECT_SETTLE_MS)
  return probeContentScript(tabId)
}

/**
 * EN: Best-effort reinject into open matching tabs (install / update). Skips discarded tabs.
 * JA: インストール／更新時に開いているマッチタブへ best-effort 再注入（休止タブはスキップ）。
 */
export async function reinjectContentScriptsIntoOpenTabs(): Promise<void> {
  const matches = listManifestContentScriptMatches(chrome.runtime.getManifest())
  let tabs: chrome.tabs.Tab[]
  try {
    tabs = await chrome.tabs.query({ url: matches })
  } catch {
    return
  }
  for (const tab of tabs) {
    if (typeof tab.id !== "number" || tab.discarded) {
      continue
    }
    if (!isScriptablePageUrl(tab.url)) {
      continue
    }
    await injectManifestContentScripts(tab.id)
  }
}
