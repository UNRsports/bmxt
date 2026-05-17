/**
 * EN: Injected via `chrome.scripting.executeScript` — scroll to a body descendant by child-index path.
 * JA: 子インデックス列で body 配下の要素へスクロールする（注入専用・依存なし）。
 */

export function bmxtDomScrollToPathInjected(path: number[]): { ok: boolean } {
  function nodeFromPath(segments: number[]): Element | null {
    if (segments.length === 0) {
      return document.body
    }
    let node: Element | null = document.body
    for (let i = 0; i < segments.length; i += 1) {
      const idx = segments[i]!
      const next = node?.children[idx] as Element | undefined
      if (!next) {
        return null
      }
      node = next
    }
    return node
  }

  const el = nodeFromPath(path)
  if (!el) {
    return { ok: false }
  }
  try {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
  } catch {
    el.scrollIntoView()
  }
  const htmlEl = el as HTMLElement
  const prevOutline = htmlEl.style.outline
  const prevOffset = htmlEl.style.outlineOffset
  htmlEl.style.outline = "2px solid #58a6ff"
  htmlEl.style.outlineOffset = "2px"
  window.setTimeout(() => {
    htmlEl.style.outline = prevOutline
    htmlEl.style.outlineOffset = prevOffset
  }, 1200)
  return { ok: true }
}
