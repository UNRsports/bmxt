/** JSON で wasm（serde）とやりとりする Effect（kind は snake_case）。 */

export type ChromeEffect =
  | { kind: "clear_log" }
  | { kind: "exit_pane" }
  | { kind: "split_row" }
  | { kind: "split_col" }
  | { kind: "list_windows" }
  | { kind: "focus_info" }
  | { kind: "activate"; tab_id: number }
  | { kind: "close_tab"; tab_id: number }
  | { kind: "go_back"; tab_id_arg: string | null }
  | { kind: "go_forward"; tab_id_arg: string | null }
  | { kind: "move_tab"; tab_id: number; window_id: number; index: number | null }
  | { kind: "new_tab"; url: string | null }
  | { kind: "list_tab_groups" }
  | { kind: "group_new"; tab_ids: number[] }
  | { kind: "tabs_nu" }
  | { kind: "tabs_move_url"; url: string }
  | { kind: "open_url_new_window"; url: string }
  | { kind: "navigate_current_tab"; url: string }
  | { kind: "open_url_new_tab"; url: string }

export type DispatchBundle = {
  ty: "lines" | "effects"
  lines?: string[]
  effects?: ChromeEffect[]
}
