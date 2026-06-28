import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { parseHTML } from "linkedom"
import { buildPathForElement } from "./injected-dom-path.ts"
import { bmxtDomClickLinkAtPathInjected } from "./injected-dom-click-path.ts"

type ParsedDom = ReturnType<typeof parseHTML>

const savedGlobals: Record<string, unknown> = {}

function installDom({ document, window }: ParsedDom): void {
  for (const key of ["document", "Element", "ShadowRoot", "HTMLIFrameElement", "Node", "window"] as const) {
    savedGlobals[key] = globalThis[key]
    globalThis[key] = (window as unknown as Record<string, unknown>)[key] ?? document[key]
  }
  globalThis.document = document
  globalThis.window = window as unknown as Window & typeof globalThis
  globalThis.MouseEvent = window.MouseEvent
  globalThis.HTMLElement = window.HTMLElement
}

function restoreGlobals(): void {
  for (const [key, value] of Object.entries(savedGlobals)) {
    if (value === undefined) {
      Reflect.deleteProperty(globalThis, key)
    } else {
      globalThis[key] = value
    }
  }
}

describe("injected-dom-click-path", () => {
  afterEach(() => {
    restoreGlobals()
  })

  it("clicks an anchor at the given path", () => {
    const parsed = parseHTML(
      '<html><body><div><a id="link" href="/next">Go</a></div></body></html>'
    )
    installDom(parsed)
    const body = parsed.document.body!
    const anchor = parsed.document.getElementById("link")!
    const path = buildPathForElement(anchor, body)
    assert.ok(path !== null)

    let clicked = false
    anchor.click = () => {
      clicked = true
    }

    const result = bmxtDomClickLinkAtPathInjected(path)
    assert.equal(result.ok, true)
    assert.equal(clicked, true)
  })

  it("returns ok:false when path does not resolve", () => {
    const parsed = parseHTML("<html><body></body></html>")
    installDom(parsed)
    assert.deepEqual(bmxtDomClickLinkAtPathInjected([99]), { ok: false })
  })

  it("returns ok:false when element is not a link", () => {
    const parsed = parseHTML("<html><body><p id='x'>text</p></body></html>")
    installDom(parsed)
    const body = parsed.document.body!
    const p = parsed.document.getElementById("x")!
    const path = buildPathForElement(p, body)
    assert.ok(path !== null)
    assert.deepEqual(bmxtDomClickLinkAtPathInjected(path), { ok: false })
  })
})
