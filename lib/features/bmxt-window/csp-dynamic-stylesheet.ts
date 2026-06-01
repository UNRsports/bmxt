/**
 * EN: Runtime CSS via Constructable Stylesheets (allowed under extension style-src 'self').
 * JA: 拡張ページの style-src 'self' で許可される Constructable Stylesheet 経由の動的 CSS。
 */

import { useLayoutEffect } from "react"

export const CSP_DYNAMIC_SCOPE_ATTR = "data-bmxt-css-scope"

let dynamicSheet: CSSStyleSheet | null = null
const ruleBySelector = new Map<string, string>()

function ensureSheet(): CSSStyleSheet | null {
  if (typeof document === "undefined") {
    return null
  }
  if (!dynamicSheet) {
    try {
      dynamicSheet = new CSSStyleSheet()
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, dynamicSheet]
    } catch {
      return null
    }
  }
  return dynamicSheet
}

function toCssBody(declarations: Record<string, string | number>): string {
  let body = ""
  for (const [prop, value] of Object.entries(declarations)) {
    const kebab = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
    body += `${kebab}:${typeof value === "number" ? String(value) : value};`
  }
  return body
}

function rebuildSheet(): void {
  const sheet = ensureSheet()
  if (!sheet) {
    return
  }
  const css = [...ruleBySelector.entries()]
    .map(([selector, body]) => `${selector}{${body}}`)
    .join("")
  sheet.replaceSync(css)
}

export function cspDynamicScopeSelector(scopeId: string): string {
  return `[${CSP_DYNAMIC_SCOPE_ATTR}="${scopeId}"]`
}

export function setCspDynamicCssRule(
  selector: string,
  declarations: Record<string, string | number>
): void {
  ruleBySelector.set(selector, toCssBody(declarations))
  rebuildSheet()
}

export function clearCspDynamicCssRule(selector: string): void {
  if (!ruleBySelector.delete(selector)) {
    return
  }
  rebuildSheet()
}

export function useCspDynamicStyle(
  scopeId: string | null,
  declarations: Record<string, string | number> | null
): void {
  const serialized = declarations ? JSON.stringify(declarations) : null
  useLayoutEffect(() => {
    if (!scopeId || !serialized) {
      return
    }
    const parsed = JSON.parse(serialized) as Record<string, string | number>
    const selector = cspDynamicScopeSelector(scopeId)
    setCspDynamicCssRule(selector, parsed)
    return () => clearCspDynamicCssRule(selector)
  }, [scopeId, serialized])
}
