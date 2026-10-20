/** EN: DOM picker HTML snippet highlighting — token kinds and CSS variable names. */
/** JA: dom picker の HTML スニペット着色（将来 setting から差し替え可能な CSS 変数）。 */

export const DOM_HTML_TOKEN_KINDS = [
  "punct",
  "tag",
  "attrName",
  "attrValue",
  "text",
  "comment"
] as const

export type DomHtmlTokenKind = (typeof DOM_HTML_TOKEN_KINDS)[number]

export type DomHtmlToken = {
  kind: DomHtmlTokenKind
  text: string
}

/** EN: CSS custom properties on `.bmxt-dom-picker` (defaults in bmxt-ui.css). */
export const DOM_HTML_SYNTAX_CSS_VARS = {
  punct: "--bmxt-dom-hl-punct",
  tag: "--bmxt-dom-hl-tag",
  attrName: "--bmxt-dom-hl-attr-name",
  attrValue: "--bmxt-dom-hl-attr-value",
  text: "--bmxt-dom-hl-text",
  comment: "--bmxt-dom-hl-comment"
} as const satisfies Record<DomHtmlTokenKind, string>

export const DOM_HTML_SYNTAX_DEFAULTS: Record<DomHtmlTokenKind, string> = {
  punct: "#6e7681",
  tag: "#7ee787",
  attrName: "#79c0ff",
  attrValue: "#a5d6ff",
  text: "#ffa657",
  comment: "#8b949e"
}

export const DOM_HTML_TOKEN_CLASS: Record<DomHtmlTokenKind, string> = {
  punct: "bmxt-dom-hl-punct",
  tag: "bmxt-dom-hl-tag",
  attrName: "bmxt-dom-hl-attr-name",
  attrValue: "bmxt-dom-hl-attr-value",
  text: "bmxt-dom-hl-text",
  comment: "bmxt-dom-hl-comment"
}

/** EN: Map for future `appearance.domHtmlSyntax` → dynamic stylesheet injection. */
export function domHtmlSyntaxDefaultsToCssDeclarations(): Record<string, string> {
  const decl: Record<string, string> = {}
  for (const kind of DOM_HTML_TOKEN_KINDS) {
    decl[DOM_HTML_SYNTAX_CSS_VARS[kind]] = DOM_HTML_SYNTAX_DEFAULTS[kind]
  }
  return decl
}
