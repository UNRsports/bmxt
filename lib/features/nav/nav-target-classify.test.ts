import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  classifyNavTarget,
  formatNavTargetLabel,
  stableHrefKey,
  type NavTargetFacts
} from "./nav-target-classify.ts"

function baseFacts(over: Partial<NavTargetFacts> = {}): NavTargetFacts {
  return {
    tag: "div",
    role: "",
    href: null,
    ariaLabel: null,
    alt: null,
    nameAttr: null,
    id: null,
    title: null,
    text: "",
    disabled: false,
    ariaHidden: false,
    pointerEventsNone: false,
    tabIndex: -1,
    contentEditable: false,
    inputType: null,
    cursorPointer: false,
    isImg: false,
    parentLinkHref: null,
    ...over
  }
}

describe("nav-target-classify", () => {
  it("classifies links with stable href key first", () => {
    const id = classifyNavTarget(
      baseFacts({
        tag: "a",
        href: "https://example.com/docs/guide?x=1#frag",
        text: "Guide"
      })
    )
    assert.equal(id.kind, "link")
    assert.equal(id.key, "/docs/guide?x=1")
    assert.ok(id.matchKeys.includes("/docs/guide?x=1"))
    assert.ok(id.matchKeys.includes("guide"))
  })

  it("classifies buttons by accessible name", () => {
    const id = classifyNavTarget(
      baseFacts({
        tag: "button",
        ariaLabel: "Save draft",
        text: "Save"
      })
    )
    assert.equal(id.kind, "button-like")
    assert.equal(id.key, "Save draft")
  })

  it("classifies editables by name/id", () => {
    const id = classifyNavTarget(
      baseFacts({
        tag: "input",
        inputType: "text",
        nameAttr: "q",
        id: "search"
      })
    )
    assert.equal(id.kind, "editable")
    assert.equal(id.key, "q")
  })

  it("classifies media by alt", () => {
    const id = classifyNavTarget(
      baseFacts({
        tag: "img",
        isImg: true,
        alt: "Company logo",
        parentLinkHref: "/home"
      })
    )
    assert.equal(id.kind, "media")
    assert.equal(id.key, "Company logo")
    assert.ok(id.matchKeys.includes("/home"))
  })

  it("marks aria-hidden as inert", () => {
    const id = classifyNavTarget(baseFacts({ tag: "a", href: "/x", ariaHidden: true }))
    assert.equal(id.kind, "inert")
  })

  it("formats short labels", () => {
    assert.equal(
      formatNavTargetLabel({
        kind: "link",
        key: "/a",
        matchKeys: ["/a"],
        confidence: 1
      }),
      "link:/a"
    )
  })

  it("stableHrefKey drops hash", () => {
    assert.equal(stableHrefKey("https://ex.test/p?q=1#h"), "/p?q=1")
  })
})
