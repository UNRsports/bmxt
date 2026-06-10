import type { MutableRefObject, ReactNode } from "react"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import { SearchListPickerOverlay } from "../../search/search-list-picker-overlay"
import type { PickerEntry } from "../model/picker-entry"
import type { PaneFocusTarget } from "../panel/pane-focus-nav"
import { PickerPanelHost } from "../panel/picker-panel-host"
import type { PickerSlotId } from "../session/session-pickers"
import type { TabPickerState } from "../session/tab-picker-state"
import type { TabPickerInteractiveSnapshot } from "../session/tab-picker-state"
import { DomPickerWrapper } from "./dom-picker-wrapper"
import { TabsPickerWrapper } from "./tabs-picker-wrapper"
import type { SearchListPickerState } from "../../search/search-list-picker-input"
import type { TabsPageActiveMode } from "../../tabs/page-active-setting"
import type { SettingListPickerState } from "../../setting/setting-list-picker-state"
import type { UiAppearance } from "../../setting/appearance"
import type { SettingPickerRow } from "../../setting/setting-picker-rows"
import { SettingPickerWrapper } from "../../setting/setting-picker-wrapper"

export type SessionPickerColumnsProps = PickerColumnHostContext

export type PickerColumnHostContext = {
  sessionId: string
  /** EN: This split leaf receives keyboard input (only one leaf at a time). */
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  activatePaneFocus: (target: PaneFocusTarget) => void
  tabPicker: TabPickerState | null
  searchListPicker: SearchListPickerState | null
  domListPicker: DomListPickerState | null
  settingListPicker: SettingListPickerState | null
  uiAppearance: UiAppearance
  tabsPickerKeyboardActive: boolean
  searchPickerKeyboardActive: boolean
  domPickerKeyboardActive: boolean
  settingPickerKeyboardActive: boolean
  tabPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  searchPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  domPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  settingPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  onSettingPickerStateChange: (next: SettingListPickerState) => void
  onSettingPickerRowAction: (row: SettingPickerRow, index: number) => void | Promise<void>
  onSettingPickerApplyEdit: (field: "fg" | "bg-color" | "font", value: string) => void | Promise<void>
  onSettingPickerEditInvalid: () => void | Promise<void>
  onAppendLog: (lines: string[]) => void | Promise<void>
  onRefreshTabPickerRows: () => Promise<void>
  scheduleRefreshTabPickerRows: () => void
  onOpenSearchEntry: (entry: PickerEntry, matchIndex: number) => void
  onDomApprove: () => void
  onTabsPickerFocusTabId?: (tabId: number | null) => void
  onTabPickerInteractiveChange?: (snapshot: TabPickerInteractiveSnapshot) => void
  tabsPageActiveMode?: TabsPageActiveMode
}

type SlotRenderer = (ctx: PickerColumnHostContext) => ReactNode

const PICKER_SLOT_RENDERERS: Record<PickerSlotId, SlotRenderer> = {
  tabs: (ctx) =>
    ctx.tabPicker ? (
      <PickerPanelHost
        focusTarget="tabs"
        paneFocus={ctx.paneFocus}
        isFocusedPane={ctx.isFocusedPane}>
        <TabsPickerWrapper
          rows={ctx.tabPicker.rows}
          showUrl={ctx.tabPicker.showUrl}
          initialHi={ctx.tabPicker.initialHi}
          pageActiveMode={ctx.tabsPageActiveMode}
          variant={ctx.tabPicker.variant ?? "default"}
          interactive={ctx.tabPicker.interactive}
          onInteractiveSnapshotChange={ctx.onTabPickerInteractiveChange}
          onAppendLog={ctx.onAppendLog}
          onRefreshRows={ctx.onRefreshTabPickerRows}
          scheduleRefreshRows={ctx.scheduleRefreshTabPickerRows}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          isHostPaneFocused={ctx.tabsPickerKeyboardActive}
          pickerInputRef={ctx.tabPickerInputRef}
          sessionId={ctx.sessionId}
          onFocusTabIdChange={ctx.onTabsPickerFocusTabId}
        />
      </PickerPanelHost>
    ) : null,
  search: (ctx) =>
    ctx.searchListPicker ? (
      <PickerPanelHost
        focusTarget="search"
        paneFocus={ctx.paneFocus}
        isFocusedPane={ctx.isFocusedPane}>
        <SearchListPickerOverlay
          state={ctx.searchListPicker}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          onOpenEntry={(entry, matchIndex) => ctx.onOpenSearchEntry(entry, matchIndex)}
          keyboardActive={ctx.searchPickerKeyboardActive}
          pickerInputRef={ctx.searchPickerInputRef}
          sessionId={ctx.sessionId}
        />
      </PickerPanelHost>
    ) : null,
  dom: (ctx) =>
    ctx.domListPicker ? (
      <PickerPanelHost
        focusTarget="dom"
        paneFocus={ctx.paneFocus}
        isFocusedPane={ctx.isFocusedPane}>
        <DomPickerWrapper
          state={ctx.domListPicker}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          keyboardActive={ctx.domPickerKeyboardActive}
          pickerInputRef={ctx.domPickerInputRef}
          sessionId={ctx.sessionId}
          onApprove={ctx.onDomApprove}
        />
      </PickerPanelHost>
    ) : null,
  setting: (ctx) =>
    ctx.settingListPicker ? (
      <PickerPanelHost
        focusTarget="setting"
        paneFocus={ctx.paneFocus}
        isFocusedPane={ctx.isFocusedPane}>
        <SettingPickerWrapper
          state={ctx.settingListPicker}
          appearance={ctx.uiAppearance}
          onStateChange={ctx.onSettingPickerStateChange}
          onRowAction={ctx.onSettingPickerRowAction}
          onApplyEdit={ctx.onSettingPickerApplyEdit}
          onEditInvalid={ctx.onSettingPickerEditInvalid}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          keyboardActive={ctx.settingPickerKeyboardActive}
          pickerInputRef={ctx.settingPickerInputRef}
          sessionId={ctx.sessionId}
        />
      </PickerPanelHost>
    ) : null
}

/** EN: Render one picker column by slot id (②+③). */
export function renderPickerSlot(slot: PickerSlotId, ctx: PickerColumnHostContext): ReactNode {
  return PICKER_SLOT_RENDERERS[slot](ctx)
}

export const PICKER_SLOT_ORDER: readonly PickerSlotId[] = ["tabs", "search", "dom", "setting"]
