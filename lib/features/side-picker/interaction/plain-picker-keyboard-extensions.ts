import type { PickerExitToDetailBarOptions } from "./picker-list-kernel"

/** EN: Optional hooks for tabs bulk/edit atop plain picker keyboard. */
/** JA: プレーン picker keyboard 上に載せる tabs 固有拡張。 */

export type PlainPickerKeyboardExtensions = {
  exitToDetailBar?: PickerExitToDetailBarOptions
  /** EN: When true, skip default j/k (bulk move/group nav handles arrows). */
  customVerticalNav?: (e: KeyboardEvent) => boolean
  isSearchJumpEnabled?: () => boolean
  matchIndices?: () => readonly number[]
  filterCommandCompletions?: (prefix: string) => readonly string[]
  onCommandEmptyEnter?: () => void
  onCommandEnter?: (buffer: string) => boolean
  onNormalEnter?: (e: KeyboardEvent) => boolean
  /** EN: Return true when Esc was fully handled. */
  onEsc?: (e: KeyboardEvent) => boolean
  onCaptureBefore?: (e: KeyboardEvent) => boolean
  onCaptureAfter?: (e: KeyboardEvent) => boolean
  onInputBeforePlain?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
  onInputAfterPlain?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
  blockOpenChords?: () => boolean
  blockPlainTyping?: () => boolean
}
