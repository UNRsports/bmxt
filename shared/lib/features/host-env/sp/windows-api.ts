/**
 * EN: SP (Fenix) — `browser.windows` is missing; return empty / no-op.
 * JA: SP（Fenix）— windows API なし。空／no-op。
 */

export function hasWindowsApi(): boolean {
  return false
}

export async function getAllWindows(
  _getInfo?: chrome.windows.QueryOptions
): Promise<chrome.windows.Window[]> {
  return []
}

export function addWindowsLifecycleListeners(_listener: () => void): () => void {
  return () => {
    /* no-op */
  }
}
