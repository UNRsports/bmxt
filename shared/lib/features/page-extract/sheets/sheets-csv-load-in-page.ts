/**
 * EN: In-tab Google Sheets CSV load via XHR (MAIN world). Does not call the Fetch API —
 *     respects extension `check:no-fetch` / connect-src (network stays on the Sheets origin).
 * JA: タブ内 XHR で Sheets CSV を取得（MAIN world）。Fetch API は使わない
 *     （拡張の no-fetch / connect-src 方針を維持。通信は Sheets 同一オリジン）。
 */

export type SheetsCsvLoadOk = {
  ok: true
  text: string
  truncated: boolean
  title: string
}

export type SheetsCsvLoadErr = {
  ok: false
  reason: "bad_args" | "http" | "network" | "html_login" | "empty"
}

export type SheetsCsvLoadResult = SheetsCsvLoadOk | SheetsCsvLoadErr

/**
 * EN: Runs via `executeScript({ func, world: "MAIN" })` — no imports (Chrome serializes the function).
 *     Callers must pass a safe spreadsheet id / gid and a positive finite maxChars.
 * JA: executeScript MAIN 用。import 禁止。呼び出し側で id/gid と正の maxChars を渡すこと。
 */
export async function bmxtLoadSheetsCsvInPage(
  spreadsheetId: string,
  gid: string,
  maxChars: number
): Promise<SheetsCsvLoadResult> {
  const idOk = typeof spreadsheetId === "string" && /^[a-zA-Z0-9_-]{10,128}$/.test(spreadsheetId)
  const gidOk = typeof gid === "string" && /^\d{1,20}$/.test(gid)
  if (!idOk || !gidOk || !Number.isFinite(maxChars) || maxChars <= 0) {
    return { ok: false, reason: "bad_args" }
  }
  const cap = Math.floor(maxChars)
  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

  const loadText = (): Promise<{ status: number; text: string; contentType: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("GET", url, true)
      xhr.withCredentials = true
      xhr.timeout = 4000
      xhr.onload = () => {
        resolve({
          status: xhr.status,
          text: typeof xhr.responseText === "string" ? xhr.responseText : "",
          contentType: xhr.getResponseHeader("content-type") ?? ""
        })
      }
      xhr.onerror = () => {
        reject(new Error("network"))
      }
      xhr.ontimeout = () => {
        reject(new Error("network"))
      }
      xhr.send()
    })
  }

  try {
    const res = await loadText()
    if (res.status < 200 || res.status >= 300) {
      return { ok: false, reason: "http" }
    }
    const lowerType = res.contentType.toLowerCase()
    const head = res.text.slice(0, 200).toLowerCase()
    if (
      lowerType.includes("text/html") ||
      head.includes("<!doctype html") ||
      head.includes("<html")
    ) {
      return { ok: false, reason: "html_login" }
    }
    if (!res.text) {
      return { ok: false, reason: "empty" }
    }
    const truncated = res.text.length > cap
    const text = truncated ? res.text.slice(0, cap) : res.text
    const title = typeof document.title === "string" ? document.title : ""
    return { ok: true, text, truncated, title }
  } catch {
    return { ok: false, reason: "network" }
  }
}
