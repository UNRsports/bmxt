import {
  isSessionSettingNameUiLine,
  isSessionSwitchUiLine,
  parseSessionListPickerLine
} from "../../session"
import { parseGroupNewInteractiveLine } from "../../tabs"
import {
  parseDomExitListLine,
  parseDomListPickerLine
} from "../../dom/dom-list-picker-input"
import { parseNavEnterLine, parseNavExitLine } from "../../nav"
import {
  parseSearchExitListLine
} from "../../search/search-list-picker-input"
import {
  parseSettingExitListLine,
  parseSettingListPickerLine
} from "../../setting"
import { parseTabsExitListLine, parseTabsListPickerLine } from "../../tabs"

export function shouldAutoSubmitAfterTokenPick(trimmed: string): boolean {
  return (
    parseDomListPickerLine(trimmed) !== null ||
    parseNavEnterLine(trimmed) ||
    parseNavExitLine(trimmed) ||
    parseTabsListPickerLine(trimmed) !== null ||
    isSessionSwitchUiLine(trimmed) ||
    isSessionSettingNameUiLine(trimmed) ||
    parseTabsExitListLine(trimmed) ||
    parseSettingListPickerLine(trimmed) ||
    parseSettingExitListLine(trimmed) ||
    parseSearchExitListLine(trimmed) ||
    parseDomExitListLine(trimmed) ||
    parseGroupNewInteractiveLine(trimmed)
  )
}
