import {
  DEFAULT_SEARCH_HIT_HIGHLIGHT_BG,
  DEFAULT_SEARCH_HIGHLIGHT_FG,
  DEFAULT_SEARCH_JUMP_HIGHLIGHT_BG
} from "../page-dom/injected-needle-highlight"
import { parseHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"
import { parseFontSizePx } from "./validate-size"
import type { SettingMessageKey } from "./i18n/ns/setting"

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

/** EN: Nullable appearance fields (null = use built-in default). */
export type UiAppearanceLayer = {
  fg: string | null
  bgColor: string | null
  fontSize: string | null
  fontFamily: string | null
  bgImageDataUrl: string | null
}

export type UiAppearance = UiAppearanceLayer & {
  /** EN: When false, picker columns inherit the global layer. */
  editPicker: boolean
  picker: UiAppearanceLayer
  /** EN: In-page search hit highlight (search picker detail). */
  searchHitHighlightBg: string | null
  /** EN: In-page jump-target highlight (search picker detail). */
  searchJumpHighlightBg: string | null
}

export const DEFAULT_UI_APPEARANCE_LAYER: UiAppearanceLayer = {
  fg: null,
  bgColor: null,
  fontSize: null,
  fontFamily: null,
  bgImageDataUrl: null
}

export const DEFAULT_UI_APPEARANCE: UiAppearance = {
  ...DEFAULT_UI_APPEARANCE_LAYER,
  editPicker: false,
  picker: { ...DEFAULT_UI_APPEARANCE_LAYER },
  searchHitHighlightBg: null,
  searchJumpHighlightBg: null
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

function parseAppearanceLayer(raw: unknown): UiAppearanceLayer {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_UI_APPEARANCE_LAYER }
  }
  const o = raw as Record<string, unknown>
  return {
    fg: typeof o.fg === "string" ? o.fg : null,
    bgColor: typeof o.bgColor === "string" ? o.bgColor : null,
    fontSize: typeof o.fontSize === "string" ? o.fontSize : null,
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : null,
    bgImageDataUrl: typeof o.bgImageDataUrl === "string" ? o.bgImageDataUrl : null
  }
}

/** EN: Normalize stored / imported appearance (backward compatible). */
export function normalizeUiAppearance(raw: Partial<UiAppearance> | null | undefined): UiAppearance {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_UI_APPEARANCE,
      picker: { ...DEFAULT_UI_APPEARANCE_LAYER }
    }
  }
  return {
    fg: raw.fg ?? null,
    bgColor: raw.bgColor ?? null,
    fontSize: raw.fontSize ?? null,
    fontFamily: raw.fontFamily ?? null,
    bgImageDataUrl: raw.bgImageDataUrl ?? null,
    editPicker: raw.editPicker === true,
    picker: parseAppearanceLayer(raw.picker),
    searchHitHighlightBg:
      typeof raw.searchHitHighlightBg === "string" ? raw.searchHitHighlightBg : null,
    searchJumpHighlightBg:
      typeof raw.searchJumpHighlightBg === "string" ? raw.searchJumpHighlightBg : null
  }
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

/** EN: Resolved picker-column theme (inherits global when editPicker is off). */
export function resolvePickerAppearance(appearance: UiAppearance): ResolvedTerminalAppearance {
  const global = resolveTerminalAppearance(appearance)
  if (!appearance.editPicker) {
    return global
  }
  const picker = appearance.picker
  return {
    fg: picker.fg ?? global.fg,
    bgColor: picker.bgColor ?? global.bgColor,
    fontSize: picker.fontSize ?? global.fontSize,
    fontFamily: picker.fontFamily ?? global.fontFamily,
    bgImageDataUrl: picker.bgImageDataUrl ?? global.bgImageDataUrl
  }
}

export type ResolvedSearchHighlightAppearance = {
  hitBg: string
  jumpBg: string
  fg: string
}

/** EN: Resolved in-page search highlight colors for the detail picker. */
export function resolveSearchHighlightAppearance(
  appearance: UiAppearance
): ResolvedSearchHighlightAppearance {
  return {
    hitBg: appearance.searchHitHighlightBg ?? DEFAULT_SEARCH_HIT_HIGHLIGHT_BG,
    jumpBg: appearance.searchJumpHighlightBg ?? DEFAULT_SEARCH_JUMP_HIGHLIGHT_BG,
    fg: DEFAULT_SEARCH_HIGHLIGHT_FG
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
  | { ok: false; errorKey: SettingMessageKey }

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
