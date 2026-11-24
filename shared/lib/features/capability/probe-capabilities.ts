/**
 * EN: Probe Chrome / web APIs BMXt relies on (Vivaldi / Arc / etc. variance).
 * JA: BMXt が依存する Chrome / Web API の可否を検査（Vivaldi / Arc 等の差向け）。
 */

import { canScriptHttpHostPages } from "../extension-permissions/http-host-access.ts"
import { isFileSystemAccessAvailable } from "../setting/settings-external-storage.ts"
import { isBuiltInTranslatorSupported } from "../translate/translator-service.ts"
import type {
  CapabilityId,
  CapabilityProbeReport,
  CapabilityProbeRow,
  CapabilityStatus
} from "./types.ts"

async function probeChromeNamespace(
  pick: () => unknown
): Promise<CapabilityStatus> {
  try {
    const value = pick()
    if (value === undefined || value === null) {
      return "ng"
    }
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeTabs(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.tabs?.query !== "function") {
      return "ng"
    }
    await chrome.tabs.query({ active: true, currentWindow: true })
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeWindows(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.windows?.getCurrent !== "function") {
      return "ng"
    }
    await chrome.windows.getCurrent()
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeTabGroups(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.tabGroups?.query !== "function") {
      return "ng"
    }
    await chrome.tabGroups.query({})
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeBookmarks(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.bookmarks?.getTree !== "function") {
      return "ng"
    }
    await chrome.bookmarks.getTree()
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeHistory(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.history?.search !== "function") {
      return "ng"
    }
    await chrome.history.search({ text: "", maxResults: 1 })
    return "ok"
  } catch {
    return "ng"
  }
}

async function probeScriptingHost(): Promise<CapabilityStatus> {
  try {
    if (typeof chrome === "undefined" || typeof chrome.scripting?.executeScript !== "function") {
      return "ng"
    }
    const allowed = await canScriptHttpHostPages()
    return allowed ? "ok" : "ng"
  } catch {
    return "ng"
  }
}

/**
 * EN: WebRTC / FSA exist on the BMXt prompt window, not on the MV3 Service Worker.
 *     Callers must run this probe in the page (see run-command UI path).
 * JA: WebRTC / FSA はプロンプト窓にあり SW には無い。ページ側で検査すること。
 */
function probeWebRtc(): CapabilityStatus {
  try {
    const g = globalThis as typeof globalThis & {
      RTCPeerConnection?: unknown
      webkitRTCPeerConnection?: unknown
    }
    if (typeof g.RTCPeerConnection === "function") {
      return "ok"
    }
    if (typeof g.webkitRTCPeerConnection === "function") {
      return "ok"
    }
    return "ng"
  } catch {
    return "ng"
  }
}

function probeFsa(): CapabilityStatus {
  try {
    return isFileSystemAccessAvailable() ? "ok" : "ng"
  } catch {
    return "ng"
  }
}

function probeTranslator(): CapabilityStatus {
  return isBuiltInTranslatorSupported() ? "ok" : "ng"
}

const PROBE_ORDER: CapabilityId[] = [
  "tabs",
  "windows",
  "tabGroups",
  "bookmarks",
  "history",
  "scriptingHost",
  "webrtc",
  "fsa",
  "translator"
]

async function probeOne(id: CapabilityId): Promise<CapabilityStatus> {
  switch (id) {
    case "tabs":
      return probeTabs()
    case "windows":
      return probeWindows()
    case "tabGroups":
      return probeTabGroups()
    case "bookmarks":
      return probeBookmarks()
    case "history":
      return probeHistory()
    case "scriptingHost":
      return probeScriptingHost()
    case "webrtc":
      return probeWebRtc()
    case "fsa":
      return probeFsa()
    case "translator":
      return probeTranslator()
    default: {
      const _exhaustive: never = id
      void _exhaustive
      return "ng"
    }
  }
}

/** EN: Run the full capability matrix (safe; failures become NG). */
export async function probeCapabilities(): Promise<CapabilityProbeReport> {
  const rows: CapabilityProbeRow[] = []
  for (const id of PROBE_ORDER) {
    const status = await probeOne(id)
    rows.push({ id, status })
  }
  // EN: Keep chrome namespace presence as a cheap sanity check for exotic hosts.
  void probeChromeNamespace(() => chrome?.runtime?.id)
  return {
    checkedAtMs: Date.now(),
    rows
  }
}
