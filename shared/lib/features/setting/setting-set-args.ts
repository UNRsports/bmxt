/**
 * EN: Closed-set parser for `setting -set <key> <value>` (no storage / Chrome imports).
 * JA: `setting -set` の閉集合パーサ（ストレージ／Chrome 非依存）。
 */

import { DEFAULT_HOST_UI_MODE, type HostUiMode } from "./host-ui-mode.ts"
import { normalizeSearchLegendMode } from "./search-legend-mode.ts"
import type { SettingDraftPatch } from "./setting-list-picker-state.ts"
import { parseHexColor } from "./validate-color.ts"
import { parseFontFamily } from "./validate-font.ts"
import { parseFontSizePx } from "./validate-size.ts"
import {
  DEFAULT_CLI_DOOR_RETRY_MS,
  DEFAULT_SYNC_HOLD_INTERVAL_MS,
  parseSyncTimingMsToken
} from "./sync-timing.ts"

function parseBoolToken(value: string): boolean | null {
  const lower = value.trim().toLowerCase()
  if (lower === "on" || lower === "true" || lower === "1") {
    return true
  }
  if (lower === "off" || lower === "false" || lower === "0") {
    return false
  }
  return null
}

function isClearToken(value: string): boolean {
  const lower = value.trim().toLowerCase()
  return lower === "" || lower === "default" || lower === "null" || lower === "reset"
}

function parseOptionalHex(value: string): string | null | undefined {
  if (isClearToken(value)) {
    return null
  }
  const parsed = parseHexColor(value)
  return parsed === null ? undefined : parsed
}

function parseOptionalFontSize(value: string): string | null | undefined {
  if (isClearToken(value)) {
    return null
  }
  const parsed = parseFontSizePx(value)
  return parsed === null ? undefined : parsed
}

function parseOptionalFontFamily(value: string): string | null | undefined {
  if (isClearToken(value)) {
    return null
  }
  const parsed = parseFontFamily(value)
  return parsed === null ? undefined : parsed
}

/** EN: Map `setting -set <key> <value>` onto a settings patch (closed key set). */
export function settingSetPatchFromArgs(
  key: string,
  value: string
): SettingDraftPatch | null {
  const k = key.trim().toLowerCase()
  const v = value.trim()
  if (k === "locale") {
    if (v === "ja" || v === "en") {
      return { locale: v }
    }
    return null
  }
  if (k === "edit-picker") {
    const b = parseBoolToken(v)
    return b === null ? null : { editPicker: b }
  }
  if (k === "ime-candidate-help") {
    const b = parseBoolToken(v)
    return b === null ? null : { imeCandidateHelp: b }
  }
  if (k === "prompt-fire") {
    const b = parseBoolToken(v)
    return b === null ? null : { promptFire: b }
  }
  if (k === "sync-hold-ms") {
    const parsed = parseSyncTimingMsToken(v)
    if (parsed === null) {
      return null
    }
    return {
      syncHoldIntervalMs:
        parsed === "default" ? DEFAULT_SYNC_HOLD_INTERVAL_MS : parsed
    }
  }
  if (k === "cli-door-retry-ms") {
    const parsed = parseSyncTimingMsToken(v)
    if (parsed === null) {
      return null
    }
    return {
      cliDoorRetryMs: parsed === "default" ? DEFAULT_CLI_DOOR_RETRY_MS : parsed
    }
  }
  if (k === "search-legend") {
    return { searchLegendMode: normalizeSearchLegendMode(v) }
  }
  if (k === "host-ui") {
    if (v === "auto" || v === "desktop" || v === "mobile") {
      return { hostUiMode: v as HostUiMode }
    }
    if (v === "default") {
      return { hostUiMode: DEFAULT_HOST_UI_MODE }
    }
    return null
  }
  if (k === "fg") {
    const fg = parseOptionalHex(v)
    return fg === undefined ? null : { appearance: { fg } }
  }
  if (k === "bg-color") {
    const bgColor = parseOptionalHex(v)
    return bgColor === undefined ? null : { appearance: { bgColor } }
  }
  if (k === "size") {
    const fontSize = parseOptionalFontSize(v)
    return fontSize === undefined ? null : { appearance: { fontSize } }
  }
  if (k === "font") {
    const fontFamily = parseOptionalFontFamily(v)
    return fontFamily === undefined ? null : { appearance: { fontFamily } }
  }
  if (k === "search-hit-highlight") {
    const searchHitHighlightBg = parseOptionalHex(v)
    return searchHitHighlightBg === undefined
      ? null
      : { appearance: { searchHitHighlightBg } }
  }
  if (k === "search-jump-highlight") {
    const searchJumpHighlightBg = parseOptionalHex(v)
    return searchJumpHighlightBg === undefined
      ? null
      : { appearance: { searchJumpHighlightBg } }
  }
  if (k === "picker-fg") {
    const fg = parseOptionalHex(v)
    return fg === undefined ? null : { picker: { fg } }
  }
  if (k === "picker-bg-color") {
    const bgColor = parseOptionalHex(v)
    return bgColor === undefined ? null : { picker: { bgColor } }
  }
  if (k === "picker-size") {
    const fontSize = parseOptionalFontSize(v)
    return fontSize === undefined ? null : { picker: { fontSize } }
  }
  if (k === "picker-font") {
    const fontFamily = parseOptionalFontFamily(v)
    return fontFamily === undefined ? null : { picker: { fontFamily } }
  }
  return null
}
