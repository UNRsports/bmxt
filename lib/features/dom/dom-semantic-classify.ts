import type { DomSemanticKind } from "./dom-semantic-kind"

export type DomSemanticElementFacts = {
  tag: string
  role: string
  href: string | null
  inputType: string | null
  contentEditable: string | null
  svgWidth: number
  svgHeight: number
}

/** EN: Pure classifier — mirrored in injected semantic capture (keep in sync). */
export function classifyDomSemanticKinds(facts: DomSemanticElementFacts): DomSemanticKind[] {
  const kinds: DomSemanticKind[] = []
  const tag = facts.tag.toLowerCase()
  const role = facts.role.toLowerCase()
  const inputType = (facts.inputType ?? "text").toLowerCase()
  const ce = facts.contentEditable
  const href = facts.href?.trim() ?? ""

  if (tag === "a") {
    kinds.push("link")
  }
  if (tag === "area" && href.length > 0) {
    kinds.push("link")
  }
  if (role === "link") {
    kinds.push("link")
  }
  if (href.length > 0 && tag !== "base" && tag !== "link") {
    kinds.push("link")
  }
  if (tag === "summary") {
    kinds.push("link")
  }

  if (tag === "img" || tag === "picture") {
    kinds.push("image")
  }
  if (tag === "svg") {
    kinds.push("image")
  }
  if (tag === "object" || tag === "embed") {
    kinds.push("image")
  }
  if (role === "img") {
    kinds.push("image")
  }
  if (inputType === "image") {
    kinds.push("image")
  }

  if (tag === "textarea" || tag === "select" || tag === "output") {
    kinds.push("form")
  }
  if (
    tag === "input" &&
    inputType !== "button" &&
    inputType !== "submit" &&
    inputType !== "reset" &&
    inputType !== "image"
  ) {
    kinds.push("form")
  }
  if (ce === "" || ce === "true" || ce === "plaintext-only") {
    kinds.push("form")
  }
  if (
    role === "textbox" ||
    role === "combobox" ||
    role === "searchbox" ||
    role === "spinbutton" ||
    role === "listbox"
  ) {
    kinds.push("form")
  }

  if (tag === "button") {
    kinds.push("button")
  }
  if (tag === "input" && (inputType === "button" || inputType === "submit" || inputType === "reset")) {
    kinds.push("button")
  }
  if (
    role === "button" ||
    role === "menuitem" ||
    role === "menuitemcheckbox" ||
    role === "menuitemradio"
  ) {
    kinds.push("button")
  }

  if (/^h[1-6]$/.test(tag)) {
    kinds.push("heading")
  }
  if (role === "heading") {
    kinds.push("heading")
  }

  return [...new Set(kinds)]
}
