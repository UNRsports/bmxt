/**
 * EN: Runs via `executeScript({ func })` / content script — no imports and no free
 *     variables (Chrome serializes only the function body; module consts are NOT available).
 *     Collects title + body line hits in-page and returns a compact match list.
 * JA: CS / executeScript 用。import・外スコープ定数禁止（Chrome は関数本体だけ送る）。
 *     ページ内でタイトル／本文ヒットを集め、マッチ配列だけ返す。
 */

export type InPageNeedleMatch = {
  lineNo: number
  snippet: string
  occurrence: number
  globalOccurrence: number
}

export type InPageNeedleMatchCollectResult = {
  title: string
  bodyLength: number
  truncated: boolean
  matches: InPageNeedleMatch[]
}

/**
 * EN: In-page collector. Callers pass positive finite caps from clamp helpers.
 * JA: ページ内コレクタ。呼び出し側で有限の正の上限を渡すこと。
 */
export function bmxtCollectPageNeedleMatchesInPage(
  needleRaw: string,
  maxMatches: number,
  maxTextChars: number
): InPageNeedleMatchCollectResult {
  // EN: All locals must live inside this function — executeScript cannot close over module scope.
  // JA: すべて関数内ローカル。executeScript はモジュールスコープを閉じ込めない。
  const snippetContext = 48
  const snippetMax = 500
  const empty: InPageNeedleMatchCollectResult = {
    title: "",
    bodyLength: 0,
    truncated: false,
    matches: []
  }
  try {
    const needle = typeof needleRaw === "string" ? needleRaw.trim() : ""
    if (!needle || !Number.isFinite(maxMatches) || maxMatches <= 0) {
      return empty
    }
    const matchCap = Math.min(Math.floor(maxMatches), 500)
    const title = document.title ?? ""
    const fullText = document.body?.innerText ?? ""
    const bodyLength = fullText.length
    const textCap =
      Number.isFinite(maxTextChars) && maxTextChars > 0
        ? Math.floor(maxTextChars)
        : bodyLength
    const truncated = bodyLength > textCap
    const text = truncated ? fullText.slice(0, textCap) : fullText
    const lowerNeedle = needle.toLowerCase()

    const matches: InPageNeedleMatch[] = []
    const occurrence = new Map<string, number>()
    let nextGlobal = 0

    const pushMatch = (lineNo: number, snippetRaw: string): void => {
      if (matches.length >= matchCap) {
        return
      }
      const snippet = snippetRaw.trim().slice(0, snippetMax)
      if (!snippet) {
        return
      }
      const key = snippet.toLowerCase()
      const occ = occurrence.get(key) ?? 0
      occurrence.set(key, occ + 1)
      matches.push({
        lineNo,
        snippet,
        occurrence: occ,
        globalOccurrence: nextGlobal
      })
      nextGlobal += 1
    }

    if (title.trim().length > 0 && title.toLowerCase().includes(lowerNeedle)) {
      pushMatch(0, title)
    }

    if (text.length === 0 || !text.toLowerCase().includes(lowerNeedle)) {
      return { title, bodyLength, truncated, matches }
    }

    const lines = text.split(/\r?\n/)
    outer: for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
      if (matches.length >= matchCap) {
        break
      }
      const line = lines[lineIdx] ?? ""
      const lineNo = lineIdx + 1
      const lowerLine = line.toLowerCase()
      let from = 0
      let hitOnLine = 0
      while (from < line.length) {
        if (matches.length >= matchCap) {
          break outer
        }
        const at = lowerLine.indexOf(lowerNeedle, from)
        if (at < 0) {
          break
        }
        let snippet: string
        if (hitOnLine === 0 && line.length <= snippetMax) {
          snippet = line.trim()
        } else {
          const start = Math.max(0, at - snippetContext)
          const end = Math.min(line.length, at + needle.length + snippetContext)
          snippet = line.slice(start, end).trim()
          if (start > 0) {
            snippet = `…${snippet}`
          }
          if (end < line.length) {
            snippet = `${snippet}…`
          }
        }
        pushMatch(lineNo, snippet)
        hitOnLine += 1
        from = at + Math.max(1, needle.length)
      }
    }

    const bodyHitCount = matches.filter((m) => m.lineNo > 0).length
    if (bodyHitCount === 0 && text.toLowerCase().includes(lowerNeedle) && matches.length < matchCap) {
      const at = text.toLowerCase().indexOf(lowerNeedle)
      if (at >= 0) {
        const start = Math.max(0, at - 96)
        const end = Math.min(text.length, at + needle.length + 96)
        let snippet = text.slice(start, end).trim()
        if (start > 0) {
          snippet = `…${snippet}`
        }
        if (end < text.length) {
          snippet = `${snippet}…`
        }
        pushMatch(1, snippet)
      }
    }

    return { title, bodyLength, truncated, matches }
  } catch {
    return empty
  }
}
