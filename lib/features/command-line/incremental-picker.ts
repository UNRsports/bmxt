import type { CandidateMatchMode } from "./ime-token-match"

/** EN: Subcommand / rest-arg picker — prefix while opening, contains while menu is open. */
export function incrementalPickerMatchMode(pickerOpen: boolean): CandidateMatchMode {
  return pickerOpen ? "contains" : "prefix"
}
