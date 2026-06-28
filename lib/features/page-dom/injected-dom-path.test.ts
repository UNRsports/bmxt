import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { parseHTML } from "linkedom"
import {
  buildPathForElement,
  pathTargetsElement,
  resolveNodeFromPath
} from "./injected-dom-path.ts"
import { bmxtDomSemanticEntriesInjected } from "./injected-dom-semantic-entries.ts"

type ParsedDom = ReturnType<typeof parseHTML>

const savedGlobals: Record<string, unknown> = {}

function installDom({ document, window }: ParsedDom): void {
  for (const key of ["document", "Element", "ShadowRoot", "HTMLIFrameElement", "Node"] as const) {
    savedGlobals[key] = globalThis[key]
    globalThis[key] = (window as unknown as Record<string, unknown>)[key] ?? document[key]
  }
  globalThis.document = document
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

function expectPathRoundtrip(body: Element, el: Element): void {
  const path = buildPathForElement(el, body)
  assert.ok(path !== null, `buildPathForElement failed for ${el.tagName}`)
  assert.equal(pathTargetsElement(path, el, body), true, `path roundtrip failed: ${JSON.stringify(path)}`)
  assert.equal(resolveNodeFromPath(path, body), el)
}

describe("injected-dom-path", () => {
  afterEach(() => {
    restoreGlobals()
  })

  it("round-trips light DOM links and images", () => {
    const parsed = parseHTML(
      '<html><body><div><a href="/">link</a></div><img src="x.png"></body></html>'
    )
    installDom(parsed)
    const body = parsed.document.body!
    expectPathRoundtrip(body, parsed.document.querySelector("a")!)
    expectPathRoundtrip(body, parsed.document.querySelector("img")!)
  })

  it("round-trips shadow DOM links and images", () => {
    const parsed = parseHTML('<html><body><div id="host"></div></body></html>')
    installDom(parsed)
    const body = parsed.document.body!
    const host = parsed.document.getElementById("host")
    assert.ok(host)
    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = '<a href="/">link</a><img src="x.png">'
    expectPathRoundtrip(body, shadow.querySelector("a")!)
    expectPathRoundtrip(body, shadow.querySelector("img")!)
  })

  it("round-trips nested shadow DOM", () => {
    const parsed = parseHTML('<html><body><div id="outer"></div></body></html>')
    installDom(parsed)
    const body = parsed.document.body!
    const outer = parsed.document.getElementById("outer")
    assert.ok(outer)
    const s1 = outer.attachShadow({ mode: "open" })
    s1.innerHTML = '<div id="inner-host"></div>'
    const innerEl = s1.querySelector("#inner-host")
    assert.ok(innerEl)
    const s2 = innerEl.attachShadow({ mode: "open" })
    s2.innerHTML = "<span>deep</span>"
    expectPathRoundtrip(body, s2.querySelector("span")!)
  })

  it("collects shadow DOM links via semantic capture", () => {
    const parsed = parseHTML('<html><body><div id="host"></div><h1>Title</h1></body></html>')
    installDom(parsed)
    const host = parsed.document.getElementById("host")
    assert.ok(host)
    host.attachShadow({ mode: "open" }).innerHTML = '<a href="/">link</a><img src="x.png">'

    const links = bmxtDomSemanticEntriesInjected("html", "link", "document")
    const images = bmxtDomSemanticEntriesInjected("html", "image", "document")
    assert.equal(links.entries?.length, 1)
    assert.equal(images.entries?.length, 1)
  })
})
