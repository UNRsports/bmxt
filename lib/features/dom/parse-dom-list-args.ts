import {
  parseDomListFlavorToken,
  parseDomPickerModeToken,
  type DomListFlavor,
  type DomPickerMode
} from "./dom-picker-mode.ts"
import { stripInvisibleFormatChars } from "../bmxt-core/line-parse.ts"

export type ParsedDomListArgs = {
  pickerMode: DomPickerMode
  flavor: DomListFlavor
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

/** EN: Parse tokens after `dom -list` (mode / flavor / pattern). */
export function parseDomListArgsFromTokens(tokens: readonly string[]): ParsedDomListArgs | null {
  let pickerMode: DomPickerMode = "normal"
  let flavor: DomListFlavor | null = null
  const patternParts: string[] = []

  for (const raw of tokens) {
    const tok = stripInvisibleFormatChars(raw.trim()).toLowerCase()
    const mode = parseDomPickerModeToken(tok)
    if (mode !== null) {
      pickerMode = mode
      continue
    }
    const flav = parseDomListFlavorToken(tok)
    if (flav !== null) {
      flavor = flav
      continue
    }
    patternParts.push(raw)
  }

  if (flavor === null) {
    return null
  }

  return {
    pickerMode,
    flavor,
    pattern: normalizeDomPattern(patternParts.join(" "))
  }
}

/** EN: Parse a full `dom -list …` command line. */
export function parseDomListCommandLine(trimmed: string): ParsedDomListArgs | null {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "dom") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  return parseDomListArgsFromTokens(parts.slice(2))
}

/** EN: True when flavor is present (picker can open). */
export function domListLineHasFlavor(trimmed: string): boolean {
  return parseDomListCommandLine(trimmed) !== null
}
