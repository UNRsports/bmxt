import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { parseHTML } from "linkedom"
import { formatDomElementLine } from "./injected-dom-display-line.ts"

type ParsedDom = ReturnType<typeof parseHTML>

const savedGlobals: Record<string, unknown> = {}

function installDom({ document, window }: ParsedDom): ParsedDom {
  for (const key of ["document", "Element", "HTMLElement", "Node"] as const) {
    savedGlobals[key] = globalThis[key]
    globalThis[key] = (window as unknown as Record<string, unknown>)[key] ?? document[key]
  }
  globalThis.document = document
  return { document, window }
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

function withElement(html: string, selector: string, run: (el: Element) => void): void {
  const parsed = parseHTML(`<html><body>${html}</body></html>`)
  installDom(parsed)
  const el = parsed.document.querySelector(selector)
  assert.ok(el)
  run(el)
}

describe("formatDomElementLine", () => {
  afterEach(() => {
    restoreGlobals()
  })

  it("uses innerText in visible-text mode", () => {
    withElement("<div>Hello <span>World</span></div>", "div", (el) => {
      assert.equal(formatDomElementLine(el, "html", "text", "no alt", 220), "Hello World")
    })
  })

  it("shows image alt or empty label in visible-text mode", () => {
    withElement('<img alt="Logo" src="x.png">', "img", (el) => {
      assert.equal(formatDomElementLine(el, "html", "text", "altなし", 220), "Logo")
    })
    withElement('<img src="x.png">', "img", (el) => {
      assert.equal(formatDomElementLine(el, "html", "text", "altなし", 220), "altなし")
    })
  })

  it("uses html snippet in tag mode", () => {
    withElement('<a href="/x">Link</a>', "a", (el) => {
      const line = formatDomElementLine(el, "html", "tag", "no alt", 220)
      assert.match(line, /^<a href="\/x">Link<\/a>$/)
    })
  })

  it("uses react tag line in tag mode", () => {
    withElement('<button id="go" class="primary">Go</button>', "button", (el) => {
      assert.equal(formatDomElementLine(el, "react", "tag", "no alt", 220), "button#go.primary")
    })
  })
})
