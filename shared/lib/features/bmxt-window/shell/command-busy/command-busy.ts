/**
 * EN: Prompt-side busy indicator (npm-style braille spinner) for long-running commands.
 * JA: 長時間コマンド向けプロンプト上ビジー表示（npm 風ブライルスピナー）。
 */

/** EN: Delay before showing the indicator (avoid flash on fast commands). */
export const COMMAND_BUSY_DELAY_MS = 1000

/** EN: Frame interval for the braille spinner animation. */
export const COMMAND_BUSY_FRAME_MS = 80

/** EN: Width of the determinate progress bar in the busy line. */
export const COMMAND_BUSY_BAR_WIDTH = 10

/** EN: Braille spinner frames (same family as common CLI / npm progress UIs). */
export const COMMAND_BUSY_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏"
] as const

export type CommandBusyToken = {
  readonly id: number
}

/**
 * EN: Standard busy progress for the prompt (extension-wide).
 * JA: プロンプト上ビジーの標準進捗（拡張全体共通）。
 *
 * - `indeterminate` — spinner + message only (total unknown)
 * - `fraction` — overall `current/total` (+ optional nested sub-progress)
 */
export type CommandBusyProgress =
  | { kind: "indeterminate" }
  | {
      kind: "fraction"
      current: number
      total: number
      /** EN: Nested units (e.g. tabs inside the current search scope). */
      subCurrent?: number
      subTotal?: number
      /** EN: Short label for the active unit (scope name, etc.). */
      detail?: string
    }

export function commandBusyFrameAt(elapsedMs: number): string {
  if (elapsedMs < 0) {
    return COMMAND_BUSY_FRAMES[0]!
  }
  const index = Math.floor(elapsedMs / COMMAND_BUSY_FRAME_MS) % COMMAND_BUSY_FRAMES.length
  return COMMAND_BUSY_FRAMES[index]!
}

export function clampBusyRatio(current: number, total: number): number {
  if (!(total > 0) || !Number.isFinite(total) || !Number.isFinite(current)) {
    return 0
  }
  if (current <= 0) {
    return 0
  }
  if (current >= total) {
    return 1
  }
  return current / total
}

/** EN: `[████░░░░░░]` style bar for determinate busy progress. */
export function formatCommandBusyBar(
  current: number,
  total: number,
  width: number = COMMAND_BUSY_BAR_WIDTH
): string {
  const safeWidth = Math.max(1, Math.floor(width))
  const ratio = clampBusyRatio(current, total)
  const filled = Math.round(ratio * safeWidth)
  const bar = "█".repeat(filled) + "░".repeat(safeWidth - filled)
  return `[${bar}]`
}

export function formatCommandBusyFraction(current: number, total: number): string {
  if (!(total > 0) || !Number.isFinite(total)) {
    return ""
  }
  const safeTotal = Math.max(1, Math.floor(total))
  const safeCurrent = Math.min(safeTotal, Math.max(0, Math.floor(current)))
  return `${safeCurrent}/${safeTotal}`
}

/**
 * EN: Compose the busy status line (spinner + message + optional bar/fraction).
 * JA: ビジー行（スピナー＋文言＋任意のバー／分数）を組み立てる。
 */
export function formatCommandBusyLabel(
  elapsedMs: number,
  message: string,
  progress: CommandBusyProgress | null = null,
  animateSpinner: boolean = true
): string {
  const frame = animateSpinner ? commandBusyFrameAt(elapsedMs) : commandBusyFrameAt(0)
  const trimmed = message.trim()
  const head = trimmed.length > 0 ? `${frame} ${trimmed}` : frame

  if (progress === null || progress.kind === "indeterminate") {
    return head
  }

  const total = progress.total
  if (!(total > 0)) {
    return head
  }

  const bar = formatCommandBusyBar(progress.current, total)
  const fraction = formatCommandBusyFraction(progress.current, total)
  let line = `${head}  ${bar} ${fraction}`

  const subTotal = progress.subTotal
  const subCurrent = progress.subCurrent
  if (
    typeof subTotal === "number" &&
    subTotal > 0 &&
    typeof subCurrent === "number" &&
    Number.isFinite(subCurrent)
  ) {
    line += ` · ${formatCommandBusyFraction(subCurrent, subTotal)}`
  }

  const detail = progress.detail?.trim()
  if (detail !== undefined && detail.length > 0) {
    line += ` · ${detail}`
  }

  return line
}

export function shouldShowCommandBusy(elapsedMs: number, delayMs: number = COMMAND_BUSY_DELAY_MS): boolean {
  return elapsedMs >= delayMs
}
