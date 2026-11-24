/**
 * EN: Parse Google Sheets edit/view URLs for spreadsheet id + sheet gid.
 * JA: Google スプレッドシート URL から spreadsheet id と gid を取る。
 */

const SHEETS_HOST = "docs.google.com"

/** EN: Spreadsheet id character set (Google Drive file ids). JA: スプレッドシート id の許容文字。 */
const SPREADSHEET_ID_RE = /^[a-zA-Z0-9_-]{10,128}$/

/** EN: Sheet gid is a non-negative integer string. JA: シート gid は非負整数文字列。 */
const GID_RE = /^\d{1,20}$/

export type GoogleSheetsUrlParts = {
  spreadsheetId: string
  /** EN: Sheet tab id; defaults to "0" when absent from the URL. */
  gid: string
}

export function isSafeGoogleSpreadsheetId(id: string): boolean {
  return SPREADSHEET_ID_RE.test(id)
}

export function isSafeGoogleSheetsGid(gid: string): boolean {
  return GID_RE.test(gid)
}

/**
 * EN: True for docs.google.com spreadsheet document URLs (edit / view / htmlview, etc.).
 * JA: docs.google.com のスプレッドシート文書 URL かどうか。
 */
export function isGoogleSheetsUrl(url: string | undefined): boolean {
  return parseGoogleSheetsUrl(url) !== null
}

function gidFromSearchOrHash(u: URL): string {
  const fromQuery = u.searchParams.get("gid")
  if (fromQuery && GID_RE.test(fromQuery)) {
    return fromQuery
  }
  const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash
  if (hash) {
    const params = new URLSearchParams(hash)
    const fromHash = params.get("gid")
    if (fromHash && GID_RE.test(fromHash)) {
      return fromHash
    }
  }
  return "0"
}

export function parseGoogleSheetsUrl(url: string | undefined): GoogleSheetsUrlParts | null {
  if (!url) {
    return null
  }
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== "https:") {
    return null
  }
  if (u.hostname.toLowerCase() !== SHEETS_HOST) {
    return null
  }
  // /spreadsheets/d/<id>/... or /spreadsheets/u/0/d/<id>/...
  const match = u.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([^/]+)/)
  if (!match) {
    return null
  }
  const spreadsheetId = match[1] ?? ""
  if (!isSafeGoogleSpreadsheetId(spreadsheetId)) {
    return null
  }
  return {
    spreadsheetId,
    gid: gidFromSearchOrHash(u)
  }
}

/**
 * EN: Build an edit URL that focuses a cell (gid + A1 range).
 * JA: セル（gid + A1）にフォーカスする edit URL を組み立てる。
 */
export function buildGoogleSheetsCellUrl(
  parts: GoogleSheetsUrlParts,
  cellRef: string
): string | null {
  const trimmed = cellRef.trim().toUpperCase()
  if (!/^[A-Z]{1,3}\d{1,7}$/.test(trimmed)) {
    return null
  }
  if (!isSafeGoogleSpreadsheetId(parts.spreadsheetId) || !isSafeGoogleSheetsGid(parts.gid)) {
    return null
  }
  const base = `https://docs.google.com/spreadsheets/d/${parts.spreadsheetId}/edit`
  const url = new URL(base)
  url.searchParams.set("gid", parts.gid)
  url.hash = `gid=${parts.gid}&range=${trimmed}`
  return url.href
}
