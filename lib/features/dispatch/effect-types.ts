/** JSON で wasm（serde）とやりとりする Effect（kind は snake_case）。 */

export type ChromeEffect =
  | { kind: "clear_log" }
  | { kind: "exit_pane" }
  | { kind: "close_tab"; tab_id: number }
  | { kind: "group_new"; tab_ids: number[] }
  | { kind: "tabs_nu" }
  | { kind: "tabs_move_url"; url: string }
  | { kind: "open_url_new_window"; url: string }
  | { kind: "navigate_current_tab"; url: string }
  | { kind: "open_url_new_tab"; url: string }
  | { kind: "release_notes_current" }
  | { kind: "release_notes_version"; version: string }
  | { kind: "release_notes_list" }

export type DispatchBundle = {
  ty: "lines" | "effects"
  lines?: string[]
  effects?: ChromeEffect[]
}
