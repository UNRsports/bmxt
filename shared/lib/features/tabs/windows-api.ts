/**
 * EN: Safe `chrome.windows` access — API is missing on Firefox for Android.
 * JA: Android では windows API が無い。
 */

export function hasWindowsApi(): boolean {
  return typeof chrome !== "undefined" && chrome.windows !== undefined
}

export async function getAllWindows(
  getInfo?: chrome.windows.QueryOptions
): Promise<chrome.windows.Window[]> {
  if (!hasWindowsApi()) {
    return []
  }
  return chrome.windows.getAll(getInfo)
}

export function addWindowsLifecycleListeners(listener: () => void): () => void {
  if (!hasWindowsApi()) {
    return () => {
      /* no-op */
    }
  }
  chrome.windows.onCreated.addListener(listener)
  chrome.windows.onRemoved.addListener(listener)
  return () => {
    chrome.windows.onCreated.removeListener(listener)
    chrome.windows.onRemoved.removeListener(listener)
  }
}
