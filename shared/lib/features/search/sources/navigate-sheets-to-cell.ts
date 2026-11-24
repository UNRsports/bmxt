/**
 * EN: Focus a Google Sheets cell by updating the tab URL (gid + A1 range).
 * JA: タブ URL（gid + A1）を更新して Google スプレッドシートのセルへフォーカスする。
 */

import {
  buildGoogleSheetsCellUrl,
  parseGoogleSheetsUrl
} from "../../url/parse-google-sheets-url"

/**
 * EN: Navigate an open Sheets tab to `cellRef` (e.g. B12). Returns false when URL/cell is invalid.
 * JA: 開いている Sheets タブを `cellRef`（例: B12）へ移動。URL／セル不正時は false。
 */
export async function navigateSheetsTabToCell(
  tabId: number,
  tabUrl: string,
  cellRef: string
): Promise<boolean> {
  const parts = parseGoogleSheetsUrl(tabUrl)
  if (!parts) {
    return false
  }
  const next = buildGoogleSheetsCellUrl(parts, cellRef)
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
