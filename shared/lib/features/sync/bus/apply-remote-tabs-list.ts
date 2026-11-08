import { buildTabPickerRowsBundle } from "../../tabs/picker-rows.ts"
import { portableRemoteFavIconUrl } from "../../tabs/tab-favicon-url.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SyncRemoteTabRow } from "../types.ts"
import { SYNC_REMOTE_TABS_MAX_ROWS } from "./remote-query-limits.ts"

/**
 * EN: Build portable tab rows for a remote tabs_list RPC on this browser.
 *     Shapes host-local tab metadata into the BMXt sync wire schema (subtractive):
 *     only fields peers need, with favicons extracted via portable allowlist.
 * JA: 受信した tabs_list 用に、このブラウザのタブ行をポータブル化する。
 *     宿主ローカルのタブ情報を BMXt sync ワイヤ型へ引き算整形する
 *     （peer が必要とするフィールドのみ。favicon は可搬 allowlist で抽出）。
 */
export async function applyRemoteTabsList(options: {
  locale: UiLocale
}): Promise<{ ok: boolean; detail: string; rows: SyncRemoteTabRow[] }> {
  try {
    const [bundle, rawTabs] = await Promise.all([
      buildTabPickerRowsBundle(false, options.locale),
      chrome.tabs.query({})
    ])
    // EN: Raw tabs.Tab.favIconUrl — not a host-local `/_favicon/` proxy URL.
    // JA: 生の tabs.Tab.favIconUrl（宿主ローカルの `/_favicon/` ではない）。
    const rawFavIconByTabId = new Map<number, string | null>()
    for (const tab of rawTabs) {
      if (typeof tab.id !== "number") {
        continue
      }
      rawFavIconByTabId.set(tab.id, portableRemoteFavIconUrl(tab.favIconUrl))
    }
    const rows: SyncRemoteTabRow[] = []
    for (const row of bundle.rows) {
      if (rows.length >= SYNC_REMOTE_TABS_MAX_ROWS) {
        return {
          ok: true,
          detail: `truncated=${SYNC_REMOTE_TABS_MAX_ROWS}`,
          rows
        }
      }
      if (row.kind === "window") {
        rows.push({
          kind: "window",
          windowId: row.windowId,
          title: row.windowTitle,
          focused: row.focused
        })
        continue
      }
      if (row.kind === "group") {
        rows.push({
          kind: "group",
          windowId: row.windowId,
          groupId: row.groupId,
          label: row.label
        })
        continue
      }
      const favIconUrl = rawFavIconByTabId.get(row.tabId) ?? null
      // EN: Omit null favIconUrl — keep the wire compact; receivers treat missing as null.
      // JA: null の favIconUrl は省略してワイヤをコンパクトに。受信側は欠落を null 扱い。
      if (favIconUrl === null) {
        rows.push({
          kind: "tab",
          tabId: row.tabId,
          windowId: row.windowId,
          groupId: row.groupId,
          title: row.title,
          url: row.url,
          active: row.active
        })
      } else {
        rows.push({
          kind: "tab",
          tabId: row.tabId,
          windowId: row.windowId,
          groupId: row.groupId,
          title: row.title,
          url: row.url,
          active: row.active,
          favIconUrl
        })
      }
    }
    return { ok: true, detail: `rows=${rows.length}`, rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message.slice(0, 200), rows: [] }
  }
}
