import {
  domHtmlSyntaxDefaultsToCssDeclarations,
  DOM_HTML_SYNTAX_CSS_VARS
} from "../dom/dom-html-syntax"
import {
  resolvePickerAppearance,
  resolveTerminalAppearance,
  type ResolvedTerminalAppearance,
  type UiAppearance
} from "./appearance"
import {
  clearCspDynamicCssRule,
  setCspDynamicCssRule
} from "../bmxt-window/csp-dynamic-stylesheet"
import { useLayoutEffect } from "react"

export const UI_THEME_HTML_SELECTOR = "html"
/** EN: When set on `html`, terminal + picker share one background image across the split row. */
export const UNIFIED_BG_ATTR = "data-bmxt-unified-bg"

function escapeCssUrlData(dataUrl: string): string {
  return dataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function resolvedToCssVarDeclarations(
  resolved: ResolvedTerminalAppearance,
  prefix: "bmxt" | "bmxt-picker"
): Record<string, string | number> {
  const fg = `--${prefix}-fg`
  const bg = `--${prefix}-bg`
  const decl: Record<string, string | number> = {
    [fg]: resolved.fg,
    [bg]: resolved.bgColor,
    [`--${prefix}-font-size`]: resolved.fontSize,
    [`--${prefix}-font-family`]: resolved.fontFamily
  }
  if (resolved.bgImageDataUrl) {
    decl[`--${prefix}-bg-image`] = `url("${escapeCssUrlData(resolved.bgImageDataUrl)}")`
    decl[`--${prefix}-bg-size`] = "cover"
    decl[`--${prefix}-bg-position`] = "center"
    decl[`--${prefix}-bg-repeat`] = "no-repeat"
  } else {
    decl[`--${prefix}-bg-image`] = "none"
    decl[`--${prefix}-bg-size`] = "auto"
    decl[`--${prefix}-bg-position`] = "center"
    decl[`--${prefix}-bg-repeat`] = "no-repeat"
  }
  if (prefix === "bmxt") {
    decl.color = "var(--bmxt-fg)"
    decl.fontSize = "var(--bmxt-font-size)"
    decl.fontFamily = "var(--bmxt-font-family)"
  }
  return decl
}

/** EN: Build CSS declarations for terminal theme (applied on `html`). */
export function appearanceToCssDeclarations(
  appearance: UiAppearance
): Record<string, string | number> {
  return resolvedToCssVarDeclarations(resolveTerminalAppearance(appearance), "bmxt")
}

/** EN: Picker-column CSS variables (also applied on `html`). */
export function pickerAppearanceToCssDeclarations(
  appearance: UiAppearance
): Record<string, string | number> {
  return {
    ...resolvedToCssVarDeclarations(resolvePickerAppearance(appearance), "bmxt-picker"),
    ...domHtmlSyntaxDefaultsToCssDeclarations()
  }
}

export { DOM_HTML_SYNTAX_CSS_VARS }

/** EN: Map resolved theme to scoped preview (--bmxt-* on a subtree). */
export function resolvedAppearanceToScopedDeclarations(
  resolved: ResolvedTerminalAppearance
): Record<string, string | number> {
  const decl = resolvedToCssVarDeclarations(resolved, "bmxt")
  return {
    ...decl,
    backgroundColor: "var(--bmxt-bg)",
    backgroundImage: "var(--bmxt-bg-image)",
    backgroundSize: "var(--bmxt-bg-size)",
    backgroundPosition: "var(--bmxt-bg-position)",
    backgroundRepeat: "var(--bmxt-bg-repeat)",
    color: "var(--bmxt-fg)",
    fontSize: "var(--bmxt-font-size)",
    fontFamily: "var(--bmxt-font-family)"
  }
}

export function useTerminalAppearance(appearance: UiAppearance): void {
  const serialized = JSON.stringify(appearance)
  useLayoutEffect(() => {
    const decl = {
      ...appearanceToCssDeclarations(appearance),
      ...pickerAppearanceToCssDeclarations(appearance)
    }
    setCspDynamicCssRule(UI_THEME_HTML_SELECTOR, decl)
    const root = document.documentElement
    if (!appearance.editPicker) {
      root.setAttribute(UNIFIED_BG_ATTR, "")
    } else {
      root.removeAttribute(UNIFIED_BG_ATTR)
    }
    return () => {
      clearCspDynamicCssRule(UI_THEME_HTML_SELECTOR)
      root.removeAttribute(UNIFIED_BG_ATTR)
    }
  }, [serialized, appearance])
}
