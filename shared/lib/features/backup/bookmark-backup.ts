/**
 * EN: Bookmark backup/restore — versioned JSON bundle inside a ZIP archive.
 * JA: ブックマークバックアップ/リストア — バージョン管理 JSON バンドル（ZIP アーカイブ内）。
 */

import { buildZipArchive, parseZipArchive } from "../setting/zip-store.ts"

// ---- Backup bundle layout ----

const MANIFEST_NAME = "bmxt-browser-backup/manifest.json"
const BOOKMARKS_NAME = "bmxt-browser-backup/bookmarks.json"

export type BookmarkBackupNode = {
  id: string
  parentId: string | null
  title: string
  url: string | null
  dateAdded: number | null
  children?: BookmarkBackupNode[]
}

export type BookmarkBackupManifest = {
  version: 1
  kind: "bookmark"
  exportedAt: string
  nodeCount: number
}

// ---- Tree flattening ----

function flattenTree(
  node: chrome.bookmarks.BookmarkTreeNode,
  parentId: string | null
): BookmarkBackupNode[] {
  const out: BookmarkBackupNode[] = []
  const item: BookmarkBackupNode = {
    id: node.id,
    parentId,
    title: node.title ?? "",
    url: node.url ?? null,
    dateAdded: typeof node.dateAdded === "number" ? node.dateAdded : null,
    children: undefined
  }
  if (node.children && node.children.length > 0) {
    item.children = []
    for (const child of node.children) {
      const childNodes = flattenTree(child, node.id)
      item.children.push(childNodes[0]!)
      out.push(...childNodes)
    }
  }
  out.unshift(item)
  return out
}

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
 * EN: Export all local bookmarks to a versioned ZIP archive and trigger download.
 * JA: ローカルブックマーク全体をバージョン管理 ZIP アーカイブへエクスポートしてダウンロードする。
 */
export async function exportBookmarkBackup(): Promise<{ filename: string; nodeCount: number }> {
  const roots = await chrome.bookmarks.getTree()
  const nodes: BookmarkBackupNode[] = []
  for (const root of roots) {
    nodes.push(...flattenTree(root, null))
  }

  const manifest: BookmarkBackupManifest = {
    version: 1,
    kind: "bookmark",
    exportedAt: new Date().toISOString(),
    nodeCount: nodes.length
  }
  const enc = new TextEncoder()
  const entries = [
    { name: MANIFEST_NAME, data: enc.encode(JSON.stringify(manifest, null, 2)) },
    { name: BOOKMARKS_NAME, data: enc.encode(JSON.stringify(nodes, null, 2)) }
  ]
  const zipBytes = buildZipArchive(entries)
  const filename = backupZipFilename("bookmarks")
  downloadBlob(new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" }), filename)
  return { filename, nodeCount: nodes.length }
}

// ---- Restore ----

function parseBookmarkNodes(raw: unknown): BookmarkBackupNode[] {
  if (!Array.isArray(raw)) {
    throw new Error("bookmarks.json must be an array")
  }
  return raw as BookmarkBackupNode[]
}

/**
 * EN: Restore bookmarks from a backup ZIP file opened via file picker.
 * JA: ファイルピッカーで開いたバックアップ ZIP からブックマークをリストアする。
 */
export async function restoreBookmarksFromFile(): Promise<
  | { ok: true; created: number }
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
          const bookmarksBytes = files.get(BOOKMARKS_NAME)
          if (!bookmarksBytes) {
            resolve({ ok: false, error: "bookmarks.json missing from backup zip" })
            return
          }
          const nodes = parseBookmarkNodes(
            JSON.parse(new TextDecoder().decode(bookmarksBytes)) as unknown
          )
          // EN: Recreate top-level bookmarks (roots have parentId === null).
          // JA: ルートブックマーク（parentId が null）から再作成する。
          let created = 0
          for (const node of nodes) {
            if (node.parentId !== null) {
              continue
            }
            if (node.url) {
              try {
                await chrome.bookmarks.create({ title: node.title, url: node.url })
                created += 1
              } catch {
                // skip failures
              }
            }
          }
          resolve({ ok: true, created })
        } catch (e) {
          resolve({ ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
    })

    document.body.appendChild(input)
    input.click()
  })
}
