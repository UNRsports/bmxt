/** EN: Semantic categories for dom -list --with → menu (extension-side, not tag-only). */

export const DOM_SEMANTIC_KINDS = ["link", "image", "form", "button", "heading"] as const

export type DomSemanticKind = (typeof DOM_SEMANTIC_KINDS)[number]

export function isDomSemanticKind(value: string): value is DomSemanticKind {
  return (DOM_SEMANTIC_KINDS as readonly string[]).includes(value)
}

export function domSemanticKindI18nKey(kind: DomSemanticKind): `dom.picker.semantic.${DomSemanticKind}` {
  return `dom.picker.semantic.${kind}`
}
