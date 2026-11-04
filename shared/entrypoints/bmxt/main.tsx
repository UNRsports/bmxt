/**
 * EN: `bmxt.html` entry — static imports only (no dynamic `import()`).
 *     Vite's `__vitePreload` helper (used for dynamic import + CSS) has stalled
 *     Fenix action overlays on the static Loading splash.
 * JA: 動的 import なし。Fenix オーバーレイで __vitePreload が Loading のまま止まるため。
 */
import "../../bmxt-ui.css"
import { bootBmxtShell } from "./boot-app"

function showBootFailure(detail: string): void {
  const rootEl = document.getElementById("root")
  if (!rootEl) {
    return
  }
  const lang = chrome.i18n.getUILanguage().toLowerCase()
  const ja = lang.startsWith("ja")
  const head =
    chrome.i18n.getMessage("shellBootFailed") ||
    (ja ? "BMXt の起動に失敗しました" : "Failed to start BMXt")
  rootEl.replaceChildren()
  const wrap = document.createElement("div")
  wrap.className = "bmxt-static-boot"
  wrap.setAttribute("role", "alert")
  const bar = document.createElement("div")
  bar.className = "bmxt-static-boot-bar"
  const main = document.createElement("div")
  main.className = "bmxt-static-boot-main"
  main.style.padding = "1rem"
  main.style.whiteSpace = "pre-wrap"
  main.style.textAlign = "left"
  main.textContent = `${head}\n${detail}`
  wrap.appendChild(bar)
  wrap.appendChild(main)
  rootEl.appendChild(wrap)
}

try {
  bootBmxtShell()
} catch (e) {
  const detail = e instanceof Error ? e.message : String(e)
  console.error("BMXt boot failed", e)
  showBootFailure(detail)
}
