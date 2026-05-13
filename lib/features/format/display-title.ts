/** Shorten titles for terminal / picker labels (shared SW + UI). */

const DISPLAY_TITLE_MAX = 96

export function displayTitle(raw: string | undefined | null): string {
  const t = (raw || "").trim().replace(/\s+/g, " ")
  if (!t) {
    return "(無題)"
  }
  return t.length > DISPLAY_TITLE_MAX ? `${t.slice(0, DISPLAY_TITLE_MAX)}…` : t
}
