/**
 * EN: In-tab Sheets CSV/HTML load + needle match (MAIN world). Returns compact matches only —
 *     never ships the full sheet text through `executeScript` (size / timeout failure mode).
 * JA: タブ内で Sheets 取得＋needle マッチ（MAIN world）。マッチ配列だけ返す
 *     （全文を executeScript で運ばない＝サイズ／タイムアウト失敗を避ける）。
 */

export type SheetsInPageMatch = {
  lineNo: number
  snippet: string
  occurrence: number
  globalOccurrence: number
  cellRef: string
  cellValue: string
  /** EN: True when rows came from full-sheet CSV export (A1 trustworthy). */
  rowTrusted: boolean
}

export type SheetsInPageCollectOk = {
  ok: true
  title: string
  bodyLength: number
  truncated: boolean
  matches: SheetsInPageMatch[]
  source: "gviz" | "export" | "htmlembed"
}

export type SheetsInPageCollectErr = {
  ok: false
  reason: "bad_args" | "load_failed" | "empty"
}

export type SheetsInPageCollectResult = SheetsInPageCollectOk | SheetsInPageCollectErr

export type SheetsInPagePreviewOk = {
  ok: true
  title: string
  text: string
  truncated: boolean
  source: "gviz" | "export" | "htmlembed"
}

export type SheetsInPagePreviewResult = SheetsInPagePreviewOk | SheetsInPageCollectErr

/**
 * EN: Self-contained for `executeScript({ func, world: "MAIN" })` — no imports / free vars.
 * JA: executeScript MAIN 用。import・外スコープ禁止。
 */
export async function bmxtCollectSheetsMatchesInPage(
  spreadsheetId: string,
  gid: string,
  needleRaw: string,
  maxMatches: number,
  maxTextChars: number
): Promise<SheetsInPageCollectResult> {
  const idOk = typeof spreadsheetId === "string" && /^[a-zA-Z0-9_-]{10,128}$/.test(spreadsheetId)
  const needle = typeof needleRaw === "string" ? needleRaw.trim() : ""
  if (!idOk || !needle || !Number.isFinite(maxMatches) || maxMatches <= 0) {
    return { ok: false, reason: "bad_args" }
  }
  if (!Number.isFinite(maxTextChars) || maxTextChars <= 0) {
    return { ok: false, reason: "bad_args" }
  }
  // EN: Prefer gid from location — `tabs.Tab.url` may omit the hash fragment.
  // JA: location の gid を優先（`tabs.Tab.url` は hash を落とすことがある）。
  let effectiveGid = typeof gid === "string" && /^\d{1,20}$/.test(gid) ? gid : "0"
  try {
    const href = String(location.href || "")
    const fromQuery = new URL(href).searchParams.get("gid")
    if (fromQuery && /^\d{1,20}$/.test(fromQuery)) {
      effectiveGid = fromQuery
    } else {
      const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : ""
      const fromHash = new URLSearchParams(hash).get("gid")
      if (fromHash && /^\d{1,20}$/.test(fromHash)) {
        effectiveGid = fromHash
      }
    }
  } catch {
    // keep effectiveGid
  }
  const matchCap = Math.min(Math.floor(maxMatches), 500)
  const textCap = Math.floor(maxTextChars)
  const snippetMax = 500
  const snippetContext = 48

  const xhrGet = (url: string): Promise<{ status: number; text: string; contentType: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("GET", url, true)
      xhr.withCredentials = true
      xhr.timeout = 10000
      xhr.onload = () => {
        resolve({
          status: xhr.status,
          text: typeof xhr.responseText === "string" ? xhr.responseText : "",
          contentType: xhr.getResponseHeader("content-type") ?? ""
        })
      }
      xhr.onerror = () => reject(new Error("network"))
      xhr.ontimeout = () => reject(new Error("network"))
      xhr.send()
    })
  }

  const looksLikeHtml = (contentType: string, text: string): boolean => {
    const lowerType = contentType.toLowerCase()
    const head = text.slice(0, 280).toLowerCase()
    return (
      lowerType.includes("text/html") ||
      head.includes("<!doctype html") ||
      head.includes("<html")
    )
  }

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let i = 0
    let inQuotes = false
    const n = text.length
    const pushField = (): void => {
      row.push(field)
      field = ""
    }
    const pushRow = (): void => {
      if (row.length === 1 && row[0] === "" && rows.length > 0) {
        row = []
        return
      }
      rows.push(row)
      row = []
    }
    while (i < n) {
      const ch = text[i]!
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"'
            i += 2
            continue
          }
          inQuotes = false
          i += 1
          continue
        }
        field += ch
        i += 1
        continue
      }
      if (ch === '"') {
        inQuotes = true
        i += 1
        continue
      }
      if (ch === ",") {
        pushField()
        i += 1
        continue
      }
      if (ch === "\r") {
        pushField()
        pushRow()
        i += 1
        if (text[i] === "\n") {
          i += 1
        }
        continue
      }
      if (ch === "\n") {
        pushField()
        pushRow()
        i += 1
        continue
      }
      field += ch
      i += 1
    }
    if (inQuotes || field.length > 0 || row.length > 0) {
      pushField()
      pushRow()
    }
    return rows
  }

  const parseHtmlTables = (html: string): string[][] => {
    const rows: string[][] = []
    try {
      const doc = new DOMParser().parseFromString(html, "text/html")
      const tables = doc.querySelectorAll("table")
      for (let t = 0; t < tables.length; t += 1) {
        const trs = tables[t]!.querySelectorAll("tr")
        for (let r = 0; r < trs.length; r += 1) {
          const cells = trs[r]!.querySelectorAll("td, th")
          if (cells.length === 0) {
            continue
          }
          const row: string[] = []
          for (let c = 0; c < cells.length; c += 1) {
            row.push((cells[c]!.textContent ?? "").replace(/\s+/g, " ").trim())
          }
          rows.push(row)
        }
      }
    } catch {
      return []
    }
    return rows
  }

  const colLetters = (colZeroBased: number): string => {
    let n = Math.floor(colZeroBased) + 1
    let out = ""
    while (n > 0) {
      const rem = (n - 1) % 26
      out = String.fromCharCode(65 + rem) + out
      n = Math.floor((n - 1) / 26)
    }
    return out || "A"
  }

  const normalize = (s: string): string => {
    const stripped = s.replace(/[\uFEFF\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, "")
    try {
      return stripped.normalize("NFKC").toLowerCase()
    } catch {
      return stripped.toLowerCase()
    }
  }

  const excerpt = (text: string, needleNorm: string, needleLen: number): string => {
    const trimmed = text.trim()
    if (!trimmed) {
      return ""
    }
    const hay = normalize(trimmed)
    const idx = hay.indexOf(needleNorm)
    if (idx < 0) {
      return trimmed.length <= snippetContext * 2 + 8
        ? trimmed
        : `${trimmed.slice(0, snippetContext * 2)}…`
    }
    const start = Math.max(0, idx - snippetContext)
    const end = Math.min(trimmed.length, idx + needleLen + snippetContext)
    const prefix = start > 0 ? "…" : ""
    const suffix = end < trimmed.length ? "…" : ""
    return `${prefix}${trimmed.slice(start, end)}${suffix}`
  }

  type Loaded = { rows: string[][]; source: "gviz" | "export" | "htmlembed" }

  const tryLoad = async (): Promise<Loaded | null> => {
    const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    // EN: Prefer full-sheet export first — gviz/htmlembed follow filters and skew A1 row numbers.
    // JA: フルシート export を優先。gviz/htmlembed はフィルタに従い A1 行がずれる。
    const candidates: { source: "gviz" | "export" | "htmlembed"; url: string; kind: "csv" | "html" }[] =
      [
        {
          source: "export",
          url: `${base}/export?format=csv&gid=${effectiveGid}`,
          kind: "csv"
        },
        {
          source: "export",
          url: `https://docs.google.com/spreadsheets/export?format=csv&id=${spreadsheetId}&gid=${effectiveGid}`,
          kind: "csv"
        },
        {
          source: "gviz",
          url: `${base}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`,
          kind: "csv"
        },
        {
          source: "htmlembed",
          url: `${base}/htmlembed?gid=${effectiveGid}`,
          kind: "html"
        }
      ]
    for (const c of candidates) {
      try {
        const res = await xhrGet(c.url)
        if (res.status < 200 || res.status >= 300 || !res.text) {
          continue
        }
        if (c.kind === "csv") {
          if (looksLikeHtml(res.contentType, res.text)) {
            continue
          }
          const rows = parseCsv(res.text)
          if (rows.length > 0) {
            return { rows, source: c.source }
          }
        } else {
          const rows = parseHtmlTables(res.text)
          if (rows.length > 0) {
            return { rows, source: c.source }
          }
        }
      } catch {
        // EN: Try the next endpoint.
      }
    }
    return null
  }

  const loaded = await tryLoad()
  if (!loaded) {
    return { ok: false, reason: "load_failed" }
  }
  if (loaded.rows.length === 0) {
    return { ok: false, reason: "empty" }
  }

  const needleNorm = normalize(needle)
  const matches: SheetsInPageMatch[] = []
  const occurrence = new Map<string, number>()
  let bodyLength = 0
  let truncated = false
  let globalOccurrence = 0

  for (let r = 0; r < loaded.rows.length; r += 1) {
    const cols = loaded.rows[r]!
    for (let c = 0; c < cols.length; c += 1) {
      const value = cols[c] ?? ""
      if (!value) {
        continue
      }
      if (bodyLength >= textCap) {
        truncated = true
        return {
          ok: true,
          title: typeof document.title === "string" ? document.title : "",
          bodyLength,
          truncated,
          matches,
          source: loaded.source
        }
      }
      const remaining = textCap - bodyLength
      const scanned = value.length > remaining ? value.slice(0, Math.max(0, remaining)) : value
      bodyLength += scanned.length
      if (scanned.length < value.length) {
        truncated = true
      }
      if (!normalize(scanned).includes(needleNorm)) {
        if (truncated) {
          return {
            ok: true,
            title: typeof document.title === "string" ? document.title : "",
            bodyLength,
            truncated,
            matches,
            source: loaded.source
          }
        }
        continue
      }
      if (matches.length >= matchCap) {
        truncated = true
        return {
          ok: true,
          title: typeof document.title === "string" ? document.title : "",
          bodyLength,
          truncated,
          matches,
          source: loaded.source
        }
      }
      const cellRef = `${colLetters(c)}${r + 1}`
      const valuePart = excerpt(scanned, needleNorm, needle.length)
        .trim()
        .slice(0, snippetMax - cellRef.length - 2)
      const snippet = `${cellRef}: ${valuePart}`.slice(0, snippetMax)
      const key = snippet.toLowerCase()
      const occ = occurrence.get(key) ?? 0
      occurrence.set(key, occ + 1)
      matches.push({
        lineNo: r + 1,
        snippet,
        occurrence: occ,
        globalOccurrence,
        cellRef,
        cellValue: scanned,
        rowTrusted: loaded.source === "export"
      })
      globalOccurrence += 1
      if (truncated) {
        return {
          ok: true,
          title: typeof document.title === "string" ? document.title : "",
          bodyLength,
          truncated,
          matches,
          source: loaded.source
        }
      }
    }
  }

  return {
    ok: true,
    title: typeof document.title === "string" ? document.title : "",
    bodyLength,
    truncated,
    matches,
    source: loaded.source
  }
}

/**
 * EN: Preview-only Sheets load for empty-pattern page scan (compact text return).
 * JA: 空パターン用の Sheets プレビュー（短いテキストのみ返す）。
 */
export async function bmxtPreviewSheetsInPage(
  spreadsheetId: string,
  gid: string,
  maxLines: number,
  maxTextChars: number
): Promise<SheetsInPagePreviewResult> {
  const idOk = typeof spreadsheetId === "string" && /^[a-zA-Z0-9_-]{10,128}$/.test(spreadsheetId)
  if (!idOk || !Number.isFinite(maxLines) || maxLines <= 0) {
    return { ok: false, reason: "bad_args" }
  }
  if (!Number.isFinite(maxTextChars) || maxTextChars <= 0) {
    return { ok: false, reason: "bad_args" }
  }
  let effectiveGid = typeof gid === "string" && /^\d{1,20}$/.test(gid) ? gid : "0"
  try {
    const href = String(location.href || "")
    const fromQuery = new URL(href).searchParams.get("gid")
    if (fromQuery && /^\d{1,20}$/.test(fromQuery)) {
      effectiveGid = fromQuery
    } else {
      const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : ""
      const fromHash = new URLSearchParams(hash).get("gid")
      if (fromHash && /^\d{1,20}$/.test(fromHash)) {
        effectiveGid = fromHash
      }
    }
  } catch {
    // keep effectiveGid
  }
  const lineCap = Math.floor(maxLines)
  const textCap = Math.floor(maxTextChars)

  const xhrGet = (url: string): Promise<{ status: number; text: string; contentType: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("GET", url, true)
      xhr.withCredentials = true
      xhr.timeout = 10000
      xhr.onload = () => {
        resolve({
          status: xhr.status,
          text: typeof xhr.responseText === "string" ? xhr.responseText : "",
          contentType: xhr.getResponseHeader("content-type") ?? ""
        })
      }
      xhr.onerror = () => reject(new Error("network"))
      xhr.ontimeout = () => reject(new Error("network"))
      xhr.send()
    })
  }

  const looksLikeHtml = (contentType: string, text: string): boolean => {
    const lowerType = contentType.toLowerCase()
    const head = text.slice(0, 280).toLowerCase()
    return (
      lowerType.includes("text/html") ||
      head.includes("<!doctype html") ||
      head.includes("<html")
    )
  }

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let i = 0
    let inQuotes = false
    const n = text.length
    const pushField = (): void => {
      row.push(field)
      field = ""
    }
    const pushRow = (): void => {
      if (row.length === 1 && row[0] === "" && rows.length > 0) {
        row = []
        return
      }
      rows.push(row)
      row = []
    }
    while (i < n) {
      const ch = text[i]!
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"'
            i += 2
            continue
          }
          inQuotes = false
          i += 1
          continue
        }
        field += ch
        i += 1
        continue
      }
      if (ch === '"') {
        inQuotes = true
        i += 1
        continue
      }
      if (ch === ",") {
        pushField()
        i += 1
        continue
      }
      if (ch === "\r") {
        pushField()
        pushRow()
        i += 1
        if (text[i] === "\n") {
          i += 1
        }
        continue
      }
      if (ch === "\n") {
        pushField()
        pushRow()
        i += 1
        continue
      }
      field += ch
      i += 1
    }
    if (inQuotes || field.length > 0 || row.length > 0) {
      pushField()
      pushRow()
    }
    return rows
  }

  const parseHtmlTables = (html: string): string[][] => {
    const rows: string[][] = []
    try {
      const doc = new DOMParser().parseFromString(html, "text/html")
      const tables = doc.querySelectorAll("table")
      for (let t = 0; t < tables.length; t += 1) {
        const trs = tables[t]!.querySelectorAll("tr")
        for (let r = 0; r < trs.length; r += 1) {
          const cells = trs[r]!.querySelectorAll("td, th")
          if (cells.length === 0) {
            continue
          }
          const row: string[] = []
          for (let c = 0; c < cells.length; c += 1) {
            row.push((cells[c]!.textContent ?? "").replace(/\s+/g, " ").trim())
          }
          rows.push(row)
        }
      }
    } catch {
      return []
    }
    return rows
  }

  const colLetters = (colZeroBased: number): string => {
    let n = Math.floor(colZeroBased) + 1
    let out = ""
    while (n > 0) {
      const rem = (n - 1) % 26
      out = String.fromCharCode(65 + rem) + out
      n = Math.floor((n - 1) / 26)
    }
    return out || "A"
  }

  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  const candidates: { source: "gviz" | "export" | "htmlembed"; url: string; kind: "csv" | "html" }[] =
    [
      { source: "export", url: `${base}/export?format=csv&gid=${effectiveGid}`, kind: "csv" },
      {
        source: "export",
        url: `https://docs.google.com/spreadsheets/export?format=csv&id=${spreadsheetId}&gid=${effectiveGid}`,
        kind: "csv"
      },
      { source: "gviz", url: `${base}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`, kind: "csv" },
      { source: "htmlembed", url: `${base}/htmlembed?gid=${effectiveGid}`, kind: "html" }
    ]

  let rows: string[][] | null = null
  let source: "gviz" | "export" | "htmlembed" = "gviz"
  for (const c of candidates) {
    try {
      const res = await xhrGet(c.url)
      if (res.status < 200 || res.status >= 300 || !res.text) {
        continue
      }
      if (c.kind === "csv") {
        if (looksLikeHtml(res.contentType, res.text)) {
          continue
        }
        const parsed = parseCsv(res.text)
        if (parsed.length > 0) {
          rows = parsed
          source = c.source
          break
        }
      } else {
        const parsed = parseHtmlTables(res.text)
        if (parsed.length > 0) {
          rows = parsed
          source = c.source
          break
        }
      }
    } catch {
      // continue
    }
  }
  if (!rows) {
    return { ok: false, reason: "load_failed" }
  }

  const lines: string[] = []
  let bodyLength = 0
  let truncated = false
  for (let r = 0; r < rows.length; r += 1) {
    const cols = rows[r]!
    for (let c = 0; c < cols.length; c += 1) {
      const value = (cols[c] ?? "").trim()
      if (!value) {
        continue
      }
      if (bodyLength >= textCap || lines.length >= lineCap) {
        truncated = true
        return {
          ok: true,
          title: typeof document.title === "string" ? document.title : "",
          text: lines.join("\n"),
          truncated,
          source
        }
      }
      const cellRef = `${colLetters(c)}${r + 1}`
      lines.push(`${cellRef}: ${value}`.slice(0, 500))
      bodyLength += value.length
    }
  }
  return {
    ok: true,
    title: typeof document.title === "string" ? document.title : "",
    text: lines.join("\n"),
    truncated,
    source
  }
}
