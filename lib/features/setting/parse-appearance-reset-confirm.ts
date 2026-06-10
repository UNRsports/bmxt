export type AppearanceResetConfirmAnswer = "yes" | "no" | "invalid"

/** EN: Parse y/n (also yes/no) after `setting -appearance --reset-default` confirmation prompt. */
export function parseAppearanceResetConfirmAnswer(trimmed: string): AppearanceResetConfirmAnswer {
  const key = trimmed.trim().toLowerCase()
  if (key === "y" || key === "yes") {
    return "yes"
  }
  if (key === "n" || key === "no") {
    return "no"
  }
  return "invalid"
}
