import { MAX_SESSION_LOG_LINES, SESSION_LOG_KEY } from "../extension-storage/keys"

/** 旧マルチペインセッションキー（移行用に参照するだけ）。 */
const LEGACY_SPLIT_KEY = "bmxt_split_session"

type LegacySplitSession = {
  v: 1
  paneLogs: Record<string, string[]>
  focusedPaneId: string
}

/**
 * セッションログを読み込む。
 * 旧 SPLIT_SESSION_KEY が残っていればフォーカスペインのログを引き継ぐ。
 */
export async function loadLog(): Promise<string[]> {
  const r = await chrome.storage.local.get([SESSION_LOG_KEY, LEGACY_SPLIT_KEY])
  if (Array.isArray(r[SESSION_LOG_KEY])) {
    return r[SESSION_LOG_KEY] as string[]
  }
  const legacy = r[LEGACY_SPLIT_KEY] as LegacySplitSession | undefined
  if (legacy && legacy.v === 1 && legacy.paneLogs && legacy.focusedPaneId) {
    const lines = (legacy.paneLogs[legacy.focusedPaneId] ?? []).slice(
      -MAX_SESSION_LOG_LINES
    )
    await chrome.storage.local.set({ [SESSION_LOG_KEY]: lines })
    await chrome.storage.local.remove(LEGACY_SPLIT_KEY)
    return lines
  }
  return []
}

export async function appendLines(newLines: string[]): Promise<void> {
  const prev = await loadLog()
  const merged = [...prev, ...newLines].slice(-MAX_SESSION_LOG_LINES)
  await chrome.storage.local.set({ [SESSION_LOG_KEY]: merged })
}

export async function clearLog(): Promise<void> {
  await chrome.storage.local.set({ [SESSION_LOG_KEY]: [] })
}

export async function setLog(lines: string[]): Promise<void> {
  await chrome.storage.local.set({
    [SESSION_LOG_KEY]: lines.slice(-MAX_SESSION_LOG_LINES)
  })
}
