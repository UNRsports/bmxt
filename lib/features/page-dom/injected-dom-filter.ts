/**
 * EN: This function is injected into the target tab via `chrome.scripting.executeScript`.
 *     It must stay self-contained (no imports / no outer closures) so the bundler serializes it.
 * JA: `chrome.scripting.executeScript` で対象タブに注入する関数。依存クロージャを持たない実装にしてください。
 */

export type DomInjectPayload = {
  op: "select" | "hide"
  selectors: string[]
}

const STYLE_ID = "bmxt-dom-filter-style"
const ROOT_CLASS = "bmxt-dom-select-root"
const MARK = "bmxt-visible"

export function bmxtDomFilterInjected(payload: DomInjectPayload): string {
  const prev = document.getElementById(STYLE_ID)
  if (prev) {
    prev.remove()
  }
  document.documentElement.classList.remove(ROOT_CLASS)
  document.querySelectorAll("." + MARK).forEach((el) => {
    el.classList.remove(MARK)
  })

  for (const sel of payload.selectors) {
    try {
      document.querySelectorAll(sel)
    } catch {
      return "error: invalid selector — " + sel
    }
  }

  if (payload.op === "hide") {
    const sheet = document.createElement("style")
    sheet.id = STYLE_ID
    sheet.textContent = payload.selectors
      .map(
        (sel) =>
          sel + "{visibility:hidden!important;display:none!important;}"
      )
      .join("\n")
    document.documentElement.appendChild(sheet)
    return "ok: -hide rules applied (reload the page to remove)."
  }

  for (const sel of payload.selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add(MARK)
    })
  }
  const sheet = document.createElement("style")
  sheet.id = STYLE_ID
  sheet.textContent =
    "html." +
    ROOT_CLASS +
    " body * { visibility: hidden !important; }\n" +
    "html." +
    ROOT_CLASS +
    " body ." +
    MARK +
    ",\n" +
    "html." +
    ROOT_CLASS +
    " body ." +
    MARK +
    " * { visibility: visible !important; }"
  document.documentElement.classList.add(ROOT_CLASS)
  document.documentElement.appendChild(sheet)
  return "ok: -select mask applied (reload the page to remove)."
}
