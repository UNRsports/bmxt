export type AppearanceResetConfirmAnswer = "yes" | "no" | "invalid"

export function parseAppearanceResetConfirmAnswer(trimmed: string): AppearanceResetConfirmAnswer {
  const t = trimmed.trim().toLowerCase()
  if (t === "y" || t === "yes") {
    return "yes"
  }
  if (t === "n" || t === "no") {
    return "no"
  }
  return "invalid"
}
