/** EN: DOM list picker layout — full tree vs viewport-synced (`--with`). */
export type DomPickerMode = "normal" | "with"

export type DomListFlavor = "--html" | "--react"

export const DOM_PICKER_MODE_TOKENS = ["--normal", "--with"] as const
export const DOM_LIST_FLAVOR_TOKENS = ["--html", "--react"] as const

export function parseDomPickerModeToken(token: string): DomPickerMode | null {
  const t = token.trim().toLowerCase()
  if (t === "--normal") {
    return "normal"
  }
  if (t === "--with") {
    return "with"
  }
  return null
}

export function parseDomListFlavorToken(token: string): DomListFlavor | null {
  const t = token.trim().toLowerCase()
  if (t === "--html") {
    return "--html"
  }
  if (t === "--react") {
    return "--react"
  }
  return null
}

export function domPickerModeLabel(mode: DomPickerMode): string {
  return mode === "with" ? "--with" : "--normal"
}
