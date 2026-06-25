import { readOpenTabInnerText } from "../page-extract/read-tab-inner-text"
import { MAX_PAGE_TEXT_CHARS } from "../search/limits"
import { isHttpUrl } from "../url/is-http-url"
import { resolveSnapshotTargetTab, type SnapshotTabResolveContext } from "./snapshot-resolve-tab"
import { saveSnapshot } from "./snapshot-storage"
import type { SnapshotSaveResult } from "./snapshot-types"

export type SnapshotSaveTabErrorCode =
  | "no_tab"
  | "not_scriptable"
  | "empty_body"
  | "save_failed"

export type SnapshotSaveFromTabResult =
  | { ok: true; result: SnapshotSaveResult }
  | { ok: false; code: SnapshotSaveTabErrorCode; message: string; url?: string }

export type SnapshotSaveFromTabOptions = SnapshotTabResolveContext

export async function saveSnapshotFromTab(
  tabIdRaw: string | undefined,
  options: SnapshotSaveFromTabOptions = {}
): Promise<SnapshotSaveFromTabResult> {
  const tab = await resolveSnapshotTargetTab(tabIdRaw, options)
  if (!tab || tab.id === undefined) {
    return { ok: false, code: "no_tab", message: "tab not found" }
  }
  const url = tab.url ?? ""
  if (!isHttpUrl(url)) {
    return {
      ok: false,
      code: "not_scriptable",
      message: "tab is not an http(s) page",
      url: url || "(no url)"
    }
  }
  const bodyText = await readOpenTabInnerText(tab, MAX_PAGE_TEXT_CHARS)
  if (bodyText === null || bodyText.trim().length === 0) {
    return { ok: false, code: "empty_body", message: "could not read page text", url }
  }
  const title = tab.title ?? ""
  try {
    const result = await saveSnapshot({ title, url, bodyText })
    return { ok: true, result }
  } catch (e) {
    return {
      ok: false,
      code: "save_failed",
      message: e instanceof Error ? e.message : String(e),
      url
    }
  }
}
