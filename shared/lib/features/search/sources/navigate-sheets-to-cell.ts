/**
 * EN: Focus a Google Sheets cell with a single strategy:
 *     1) Name Box (in-tab, no reload) when possible
 *     2) else one `tabs.update` to `#range=`
 *     Never stack Find + location.assign + tabs.update — that crashes Sheets (esp. with filters).
 * JA: Google スプレッドシートのセルへは単一手段のみ:
 *     1) 可能なら Name Box（タブ内・リロードなし）
 *     2) だめなら `tabs.update` を一度だけ
 *     Find + location.assign + tabs.update の重ねがけはしない（フィルタ時に Sheets が落ちる）。
 */

import {
  buildGoogleSheetsCellUrl,
  parseGoogleSheetsUrl
} from "../../url/parse-google-sheets-url"
import { bmxtNavigateSheetsCellInPage } from "./sheets-navigate-in-page"

export type NavigateSheetsTabToCellOptions = {
  cellRef: string
  /** EN: Kept for API compatibility; Find is not used (Sheets crash risk). */
  cellValue?: string
  /** EN: Kept for API compatibility; ignored (Find path removed). */
  preferFind?: boolean
}

/**
 * EN: Navigate an open Sheets tab to a cell. Returns false when A1 is missing or both strategies fail.
 * JA: 開いている Sheets タブをセルへ移動。A1 無し／両手段失敗時は false。
 */
export async function navigateSheetsTabToCell(
  tabId: number,
  tabUrl: string,
  cellRefOrOptions: string | NavigateSheetsTabToCellOptions
): Promise<boolean> {
  const options: NavigateSheetsTabToCellOptions =
    typeof cellRefOrOptions === "string"
      ? { cellRef: cellRefOrOptions }
      : cellRefOrOptions

  const parts = parseGoogleSheetsUrl(tabUrl)
  if (!parts) {
    return false
  }
  const ref = options.cellRef.trim().toUpperCase()
  if (!/^[A-Z]{1,3}\d{1,7}$/.test(ref)) {
    return false
  }

  // EN: Prefer soft Name Box — avoids full navigation that can fault Sheets with filters.
  // JA: Name Box を優先（フィルタ中のフルナビで Sheets が落ちるのを避ける）。
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: bmxtNavigateSheetsCellInPage,
      args: [parts.gid, ref, "", false]
    })
    if (injected?.[0]?.result === true) {
      return true
    }
  } catch {
    // EN: Fall through to tabs.update.
  }

  const next = buildGoogleSheetsCellUrl(parts, ref)
  if (!next) {
    return false
  }
  try {
    await chrome.tabs.update(tabId, { url: next })
    return true
  } catch {
    return false
  }
}
