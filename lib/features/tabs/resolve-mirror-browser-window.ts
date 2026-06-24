import {
  BMXT_WINDOW_ID_KEY,
  LAST_NORMAL_WINDOW_KEY
} from "../extension-storage/keys"

/**
 * BMXt を除く「いま追うべき」通常ウィンドウ ID（storage 値は呼び出し側で読み済み）。
 */
export async function resolveMirrorBrowserWindowIdFromStorage(
  bmxtWid: number | undefined,
  lastNormal: number | undefined
): Promise<number | undefined> {
  try {
    const lf = await chrome.windows.getLastFocused()
    if (
      lf.id !== undefined &&
      lf.type === "normal" &&
      (bmxtWid === undefined || lf.id !== bmxtWid)
    ) {
      return lf.id
    }
  } catch {
    /* fall through */
  }
  if (typeof lastNormal === "number" && Number.isInteger(lastNormal)) {
    return lastNormal
  }
  return undefined
}

/**
 * BMXt を除く「いま追うべき」通常ウィンドウ ID。
 * ブラウザ側が最前面ならそれを、BMXt が最前面なら直前にフォーカスされていた通常ウィンドウ（storage）を返す。
 */
export async function resolveMirrorBrowserWindowId(): Promise<number | undefined> {
  const r = await chrome.storage.local.get([BMXT_WINDOW_ID_KEY, LAST_NORMAL_WINDOW_KEY])
  const bmxtWid = r[BMXT_WINDOW_ID_KEY] as number | undefined
  const lastNormal = r[LAST_NORMAL_WINDOW_KEY] as number | undefined
  const lastNormalWindowId =
    typeof lastNormal === "number" && Number.isInteger(lastNormal) ? lastNormal : undefined
  return resolveMirrorBrowserWindowIdFromStorage(bmxtWid, lastNormalWindowId)
}
