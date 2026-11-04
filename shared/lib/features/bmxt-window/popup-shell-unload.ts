/**
 * EN: Notify the SW when the popup shell (`bmxt.html`) unloads.
 *     Needed for Firefox `action.default_popup` overlays — `windows.onRemoved` does not fire.
 *     Chrome popup windows also fire this; clearing twice with `onRemoved` is harmless.
 * JA: ポップアップシェル破棄時に SW へ通知。Firefox オーバーレイは windows.onRemoved が無い。
 */

export const BMXT_POPUP_SHELL_UNLOAD_MESSAGE = "BMXT_POPUP_SHELL_UNLOAD" as const

export type BmxtPopupShellUnloadMessage = {
  type: typeof BMXT_POPUP_SHELL_UNLOAD_MESSAGE
}

export function isBmxtPopupShellUnloadMessage(
  message: unknown
): message is BmxtPopupShellUnloadMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  return (message as { type?: unknown }).type === BMXT_POPUP_SHELL_UNLOAD_MESSAGE
}

/**
 * EN: Install once on `bmxt.html`. Skips bfcache (`persisted`) restores.
 * JA: `bmxt.html` で一度だけ登録。bfcache 復元時は送らない。
 */
export function installPopupShellUnloadNotify(): () => void {
  const onPageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      return
    }
    try {
      void chrome.runtime.sendMessage({ type: BMXT_POPUP_SHELL_UNLOAD_MESSAGE })
    } catch {
      /* SW may already be gone */
    }
  }

  window.addEventListener("pagehide", onPageHide)
  return () => {
    window.removeEventListener("pagehide", onPageHide)
  }
}
