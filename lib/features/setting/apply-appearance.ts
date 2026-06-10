import {
  resolveTerminalAppearance,
  type UiAppearance
} from "./appearance"
import {
  clearCspDynamicCssRule,
  setCspDynamicCssRule
} from "../bmxt-window/csp-dynamic-stylesheet"
import { useLayoutEffect } from "react"

export const UI_THEME_HTML_SELECTOR = "html"

function escapeCssUrlData(dataUrl: string): string {
  return dataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** EN: Build CSS declarations for terminal theme (applied on `html`). */
export function appearanceToCssDeclarations(
  appearance: UiAppearance
): Record<string, string | number> {
  const resolved = resolveTerminalAppearance(appearance)
  const decl: Record<string, string | number> = {
    "--bmxt-fg": resolved.fg,
    "--bmxt-bg": resolved.bgColor,
    "--bmxt-font-size": resolved.fontSize,
    "--bmxt-font-family": resolved.fontFamily,
    color: "var(--bmxt-fg)",
    backgroundColor: "var(--bmxt-bg)",
    fontSize: "var(--bmxt-font-size)",
    fontFamily: "var(--bmxt-font-family)"
  }
  if (resolved.bgImageDataUrl) {
    decl.backgroundImage = `url("${escapeCssUrlData(resolved.bgImageDataUrl)}")`
    decl.backgroundSize = "cover"
    decl.backgroundPosition = "center"
    decl.backgroundRepeat = "no-repeat"
  } else {
    decl.backgroundImage = "none"
  }
  return decl
}

export function useTerminalAppearance(appearance: UiAppearance): void {
  const serialized = JSON.stringify(appearance)
  useLayoutEffect(() => {
    const decl = appearanceToCssDeclarations(appearance)
    setCspDynamicCssRule(UI_THEME_HTML_SELECTOR, decl)
    return () => clearCspDynamicCssRule(UI_THEME_HTML_SELECTOR)
  }, [serialized, appearance])
}
