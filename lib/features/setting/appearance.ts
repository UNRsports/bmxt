import type { MessageKey } from "./i18n/messages"
import { parseHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"
import { parseFontSizePx } from "./validate-size"

export const APPEARANCE_FLAG_TOKENS = [
  "--fg",
  "--bg-color",
  "--size",
  "--font",
  "--bg-import",
  "--bg-clear",
  "--reset-default"
] as const

export type AppearanceFlagToken = (typeof APPEARANCE_FLAG_TOKENS)[number]

export type UiAppearance = {
  fg: string | null
  bgColor: string | null
  fontSize: string | null
  fontFamily: string | null
  bgImageDataUrl: string | null
}

export const DEFAULT_UI_APPEARANCE: UiAppearance = {
  fg: null,
  bgColor: null,
  fontSize: null,
  fontFamily: null,
  bgImageDataUrl: null
}

export const DEFAULT_TERMINAL_FG = "#c9d1d9"
export const DEFAULT_TERMINAL_BG = "#0d1117"
export const DEFAULT_TERMINAL_FONT_SIZE = "12px"
export const DEFAULT_TERMINAL_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"

/** EN: Max encoded background image size (bytes) without `unlimitedStorage`. */
export const BG_IMAGE_MAX_BYTES = 512 * 1024

export const BG_IMAGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp"
] as const

export type ResolvedTerminalAppearance = {
  fg: string
  bgColor: string
  fontSize: string
  fontFamily: string
  bgImageDataUrl: string | null
}

export function resolveTerminalAppearance(appearance: UiAppearance): ResolvedTerminalAppearance {
  return {
    fg: appearance.fg ?? DEFAULT_TERMINAL_FG,
    bgColor: appearance.bgColor ?? DEFAULT_TERMINAL_BG,
    fontSize: appearance.fontSize ?? DEFAULT_TERMINAL_FONT_SIZE,
    fontFamily: appearance.fontFamily ?? DEFAULT_TERMINAL_FONT_FAMILY,
    bgImageDataUrl: appearance.bgImageDataUrl
  }
}

export function parseAppearanceFlagToken(token: string): AppearanceFlagToken | null {
  const key = token.trim().toLowerCase()
  for (const flag of APPEARANCE_FLAG_TOKENS) {
    if (flag === key) {
      return flag
    }
  }
  return null
}

export function listAppearanceFlagTokens(): readonly AppearanceFlagToken[] {
  return APPEARANCE_FLAG_TOKENS
}

export type AppearancePatchResult =
  | { ok: true; patch: Partial<UiAppearance> }
  | { ok: false; errorKey: MessageKey }

export function buildAppearancePatch(
  flag: AppearanceFlagToken,
  value: string | null
): AppearancePatchResult {
  switch (flag) {
    case "--fg": {
      if (!value) {
        return { ok: false, errorKey: "setting.error.usageFg" }
      }
      const fg = parseHexColor(value)
      if (!fg) {
        return { ok: false, errorKey: "setting.error.fgHex" }
      }
      return { ok: true, patch: { fg } }
    }
    case "--bg-color": {
      if (!value) {
        return { ok: false, errorKey: "setting.error.usageBgColor" }
      }
      const bgColor = parseHexColor(value)
      if (!bgColor) {
        return { ok: false, errorKey: "setting.error.bgColorHex" }
      }
      return { ok: true, patch: { bgColor } }
    }
    case "--size": {
      if (!value) {
        return { ok: false, errorKey: "setting.error.usageSize" }
      }
      const fontSize = parseFontSizePx(value)
      if (!fontSize) {
        return { ok: false, errorKey: "setting.error.sizeRange" }
      }
      return { ok: true, patch: { fontSize } }
    }
    case "--font": {
      if (!value) {
        return { ok: false, errorKey: "setting.error.usageFont" }
      }
      const fontFamily = parseFontFamily(value)
      if (!fontFamily) {
        return { ok: false, errorKey: "setting.error.fontChars" }
      }
      return { ok: true, patch: { fontFamily } }
    }
    case "--bg-import":
      return { ok: true, patch: {} }
    case "--bg-clear":
      return { ok: true, patch: { bgImageDataUrl: null } }
    case "--reset-default":
      return { ok: true, patch: { ...DEFAULT_UI_APPEARANCE } }
    default: {
      const _exhaustive: never = flag
      return _exhaustive
    }
  }
}
