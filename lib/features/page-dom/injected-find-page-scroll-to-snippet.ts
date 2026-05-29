/**
 * EN: Injected via `chrome.scripting.executeScript` — scroll to the Nth case-insensitive
 *     substring match of `snippet` in the page and briefly highlight it.
 * JA: ページ内の snippet 部分一致（大文字小文字無視）の occurrence 番目へスクロールして強調表示。
 */

export function bmxtFindPageScrollToSnippetInjected(
  snippet: string,
  occurrence: number
): { ok: boolean } {
  const needle = snippet.trim()
  if (!needle || !document.body) {
    return { ok: false }
  }
  const needleLower = needle.toLowerCase()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let seen = 0
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? ""
    let from = 0
    while (from < text.length) {
      const idx = text.toLowerCase().indexOf(needleLower, from)
      if (idx < 0) {
        break
      }
      if (seen === occurrence) {
        try {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, Math.min(idx + needle.length, text.length))
          const rect = range.getBoundingClientRect()
          const el =
            (range.commonAncestorContainer as Node).nodeType === Node.ELEMENT_NODE
              ? (range.commonAncestorContainer as Element)
              : range.commonAncestorContainer.parentElement
          if (el) {
            try {
              el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
            } catch {
              el.scrollIntoView()
            }
          } else if (rect.height > 0 || rect.width > 0) {
            window.scrollTo({
              top: window.scrollY + rect.top - window.innerHeight / 3,
              left: window.scrollX + rect.left,
              behavior: "smooth"
            })
          }
          const mark = document.createElement("mark")
          mark.setAttribute("data-bmxt-find-hl", "1")
          mark.style.backgroundColor = "rgba(255, 213, 79, 0.55)"
          mark.style.color = "inherit"
          try {
            range.surroundContents(mark)
          } catch {
            /* split across elements — outline parent */
            const parent = el as HTMLElement | null
            if (parent) {
              const prevOutline = parent.style.outline
              const prevOffset = parent.style.outlineOffset
              parent.style.outline = "2px solid #f9a825"
              parent.style.outlineOffset = "2px"
              window.setTimeout(() => {
                parent.style.outline = prevOutline
                parent.style.outlineOffset = prevOffset
              }, 1400)
            }
          }
          window.setTimeout(() => {
            document.querySelectorAll("mark[data-bmxt-find-hl]").forEach((m) => {
              const p = m.parentNode
              if (!p) {
                return
              }
              while (m.firstChild) {
                p.insertBefore(m.firstChild, m)
              }
              p.removeChild(m)
              p.normalize()
            })
          }, 1400)
          return { ok: true }
        } catch {
          return { ok: false }
        }
      }
      seen += 1
      from = idx + Math.max(1, needle.length)
    }
  }
  return { ok: false }
}
