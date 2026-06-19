/** EN: Cap in-picker loading log rows (progress spam + render cost). */
export const MAX_SEARCH_LOADING_PROGRESS_LINES = 16

export function trimSearchLoadingProgressLines(lines: readonly string[]): string[] {
  if (lines.length <= MAX_SEARCH_LOADING_PROGRESS_LINES) {
    return [...lines]
  }
  return lines.slice(lines.length - MAX_SEARCH_LOADING_PROGRESS_LINES)
}

export function appendSearchLoadingProgressLine(
  lines: readonly string[],
  message: string
): string[] {
  return trimSearchLoadingProgressLines([...lines, message])
}
