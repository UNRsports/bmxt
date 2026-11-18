/**
 * EN: History backup/restore — versioned JSON bundle inside a ZIP archive.
 * JA: 履歴バックアップ/リストア — バージョン管理 JSON バンドル（ZIP アーカイブ内）。
 */

import { buildZipArchive, parseZipArchive } from "../setting/zip-store.ts"

// ---- Backup bundle layout ----

const MANIFEST_NAME = "bmxt-browser-backup/manifest.json"
const HISTORY_NAME = "bmxt-browser-backup/history.json"

/** EN: Max entries exported; Chrome history API may return fewer for recent visits. */
const EXPORT_MAX_RESULTS = 10_000
/** EN: Lookback window for export (all time = very large epoch). */
const EXPORT_LOOKBACK_MS = 10 * 365 * 24 * 60 * 60 * 1_000

export type HistoryBackupItem = {
  url: string
  title: string
  lastVisitTime: number
  visitCount: number
}

export type HistoryBackupManifest = {
  version: 1
  kind: "history"
  exportedAt: string
  itemCount: number
}

// ---- Helpers ----

function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("download unavailable in this context")
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function backupZipFilename(kind: string): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `bmxt-backup-${kind}-${stamp}.zip`
}

// ---- Export ----

/**
 * EN: Export browser history to a versioned ZIP archive and trigger download.
 * JA: ブラウザ履歴をバージョン管理 ZIP アーカイブへエクスポートしてダウンロードする。
 */
export async function exportHistoryBackup(): Promise<{ filename: string; itemCount: number }> {
  const startTime = Date.now() - EXPORT_LOOKBACK_MS
  const rawItems = await chrome.history.search({
    text: "",
    startTime,
    maxResults: EXPORT_MAX_RESULTS
  })
  const items: HistoryBackupItem[] = rawItems
    .filter((item): item is chrome.history.HistoryItem & { url: string } =>
      typeof item.url === "string" && item.url.length > 0
    )
    .map((item) => ({
      url: item.url,
      title: item.title ?? "",
      lastVisitTime: item.lastVisitTime ?? 0,
      visitCount: item.visitCount ?? 1
    }))

  const manifest: HistoryBackupManifest = {
    version: 1,
    kind: "history",
    exportedAt: new Date().toISOString(),
    itemCount: items.length
  }
  const enc = new TextEncoder()
  const entries = [
    { name: MANIFEST_NAME, data: enc.encode(JSON.stringify(manifest, null, 2)) },
    { name: HISTORY_NAME, data: enc.encode(JSON.stringify(items, null, 2)) }
  ]
  const zipBytes = buildZipArchive(entries)
  const filename = backupZipFilename("history")
  downloadBlob(new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" }), filename)
  return { filename, itemCount: items.length }
}

// ---- Restore ----

function parseHistoryItems(raw: unknown): HistoryBackupItem[] {
  if (!Array.isArray(raw)) {
    throw new Error("history.json must be an array")
  }
  return raw as HistoryBackupItem[]
}

export type RestoreHistoryMode = "url" | "as-bookmarks"

/**
 * EN: Restore history from a backup ZIP file opened via file picker.
 *     mode "url"          → `chrome.history.addUrl` for each item (default).
 *     mode "as-bookmarks" → creates bookmarks for each URL instead.
 * JA: ファイルピッカーで開いたバックアップ ZIP から履歴をリストアする。
 *     mode "url"          → 各アイテムに chrome.history.addUrl（デフォルト）。
 *     mode "as-bookmarks" → URL ごとにブックマークを作成する。
 */
export async function restoreHistoryFromFile(
  mode: RestoreHistoryMode = "url",
  parentId?: string | null
): Promise<
  | { ok: true; restored: number }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: string }
> {
  if (typeof document === "undefined") {
    return { ok: false, error: "file picker unavailable" }
  }
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".zip,application/zip"
    input.style.position = "fixed"
    input.style.left = "-9999px"
    input.style.opacity = "0"
    input.style.pointerEvents = "none"

    input.addEventListener("change", () => {
      void (async () => {
        const file = input.files?.[0]
        input.remove()
        if (!file) {
          resolve({ ok: false, cancelled: true })
          return
        }
        try {
          const buf = new Uint8Array(await file.arrayBuffer())
          const entries = parseZipArchive(buf)
          const files = new Map<string, Uint8Array>()
          for (const entry of entries) {
            files.set(entry.name.replace(/\\/g, "/"), entry.data)
          }
          const historyBytes = files.get(HISTORY_NAME)
          if (!historyBytes) {
            resolve({ ok: false, error: "history.json missing from backup zip" })
            return
          }
          const items = parseHistoryItems(
            JSON.parse(new TextDecoder().decode(historyBytes)) as unknown
          )

          let restored = 0
          if (mode === "as-bookmarks") {
            for (const item of items) {
              if (!item.url) {
                continue
              }
              try {
                await chrome.bookmarks.create({
                  title: item.title || item.url,
                  url: item.url,
                  ...(parentId ? { parentId } : {})
                })
                restored += 1
              } catch {
                // skip failures
              }
            }
          } else {
            // mode === "url"
            for (const item of items) {
              if (!item.url) {
                continue
              }
              try {
                await chrome.history.addUrl({ url: item.url })
                restored += 1
              } catch {
                // skip failures
              }
            }
          }
          resolve({ ok: true, restored })
        } catch (e) {
          resolve({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
    })

    document.body.appendChild(input)
    input.click()
  })
}
