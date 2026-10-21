/** EN: Parse `dom -list` tokens (mode, flavor, pattern). */

import {
  parseDomListFlavorToken,
  parseDomListShowTagToken,
  parseDomPickerModeToken,
  type DomListFlavor,
  type DomPickerMode
} from "./dom-picker-mode.ts"
import { stripInvisibleFormatChars } from "../bmxt-core/line-parse.ts"

export type DomListLineOptions = {
  pickerMode: DomPickerMode
  flavor: DomListFlavor
  showTag: boolean
  pattern: string
}

function normalizeDomPattern(raw: string): string {
  const t = stripInvisibleFormatChars(raw.trim())
  const chs = [...t]
  if (chs.length >= 2) {
    const a = chs[0]
    const b = chs[chs.length - 1]
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return stripInvisibleFormatChars(chs.slice(1, -1).join("").trim())
    }
  }
  return t
}

function normalizeToken(token: string): string {
  return stripInvisibleFormatChars(token.trim()).toLowerCase()
}

/**
 * EN: Parse `dom -list [--normal|--with] [--html|--react] [--tag] [<pattern>]`.
 * JA: デフォルト flavor は `--html`。
 */
export function parseDomListLine(trimmed: string): DomListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "dom") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  let pickerMode: DomPickerMode = "normal"
  let flavor: DomListFlavor = "--html"
  let showTag = false
  const patternParts: string[] = []

  for (let index = 2; index < parts.length; index += 1) {
    const raw = parts[index]!
    const token = normalizeToken(raw)
    const mode = parseDomPickerModeToken(token)
    if (mode !== null) {
      pickerMode = mode
      continue
    }
    const flav = parseDomListFlavorToken(token)
    if (flav !== null) {
      flavor = flav
      continue
    }
    if (parseDomListShowTagToken(token) === true) {
      showTag = true
      continue
    }
    if (token.startsWith("--")) {
      return null
    }
    patternParts.push(raw)
  }

  return {
    pickerMode,
    flavor,
    showTag: pickerMode === "with" ? showTag : false,
    pattern: normalizeDomPattern(patternParts.join(" "))
  }
}
