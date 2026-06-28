import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { classifyDomSemanticKinds } from "./dom-semantic-classify.ts"

describe("classifyDomSemanticKinds", () => {
  it("detects links by tag, href attribute, and role", () => {
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "a",
        role: "",
        href: "https://example.com",
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["link"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "a",
        role: "",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["link"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "span",
        role: "link",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["link"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "div",
        role: "",
        href: "/orders",
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["link"]
    )
  })

  it("detects images and form controls", () => {
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "img",
        role: "",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["image"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "svg",
        role: "",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["image"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "input",
        role: "textbox",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["form"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "input",
        role: "",
        href: null,
        inputType: "text",
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["form"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "input",
        role: "",
        href: null,
        inputType: "submit",
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["button"]
    )
  })

  it("detects headings and menu buttons", () => {
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "h2",
        role: "",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["heading"]
    )
    assert.deepEqual(
      classifyDomSemanticKinds({
        tag: "span",
        role: "menuitem",
        href: null,
        inputType: null,
        contentEditable: null,
        svgWidth: 0,
        svgHeight: 0
      }),
      ["button"]
    )
  })
})
