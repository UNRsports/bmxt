/**
 * EN: PC — register `windows.onFocusChanged` when the API exists.
 * JA: PC — windows API があるときだけ onFocusChanged を登録する。
 */

export type MirrorFocusHandler = (windowId: number) => void

export function addMirrorWindowFocusListener(handler: MirrorFocusHandler): () => void {
  if (typeof chrome === "undefined" || chrome.windows === undefined) {
    return () => {
      /* no-op */
    }
  }
  const onFocusChanged = (windowId: number) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      return
    }
    handler(windowId)
  }
  chrome.windows.onFocusChanged.addListener(onFocusChanged)
  return () => {
    chrome.windows.onFocusChanged.removeListener(onFocusChanged)
  }
}

export async function getNormalWindowOrNull(
  windowId: number
): Promise<chrome.windows.Window | null> {
  if (typeof chrome === "undefined" || chrome.windows === undefined) {
    return null
  }
  try {
    const win = await chrome.windows.get(windowId)
    if (win.type !== "normal") {
      return null
    }
    return win
  } catch {
    return null
  }
}

export async function getLastFocusedWindowOrNull(): Promise<chrome.windows.Window | null> {
  if (typeof chrome === "undefined" || chrome.windows === undefined) {
    return null
  }
  try {
    return await chrome.windows.getLastFocused()
  } catch {
    return null
  }
}
