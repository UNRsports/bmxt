/**
 * EN: SP — no `windows` API; focus mirroring is tabs.onActivated only (caller).
 * JA: SP — windows なし。フォーカスミラーは呼び出し側の tabs.onActivated のみ。
 */

export type MirrorFocusHandler = (windowId: number) => void

export function addMirrorWindowFocusListener(_handler: MirrorFocusHandler): () => void {
  return () => {
    /* no-op */
  }
}

export async function getNormalWindowOrNull(
  _windowId: number
): Promise<chrome.windows.Window | null> {
  return null
}

export async function getLastFocusedWindowOrNull(): Promise<chrome.windows.Window | null> {
  return null
}
