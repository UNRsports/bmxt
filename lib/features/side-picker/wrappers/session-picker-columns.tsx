import type { MutableRefObject } from "react"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { FindListPickerState } from "../../find/find-list-picker-input"
import { FindListPickerOverlay } from "../../find/find-list-picker-overlay"
import type { PickerEntry } from "../model/picker-entry"
import type { PaneFocusTarget } from "../panel/pane-focus-nav"
import { PickerPanelHost } from "../panel/picker-panel-host"
import type { TabPickerState } from "../session/tab-picker-state"
import { DomPickerWrapper } from "./dom-picker-wrapper"
import { TabsPickerWrapper } from "./tabs-picker-wrapper"

export type SessionPickerColumnsProps = {
  sessionId: string
  paneFocus: PaneFocusTarget
  activatePaneFocus: (target: PaneFocusTarget) => void
  tabPicker: TabPickerState | null
  findListPicker: FindListPickerState | null
  domListPicker: DomListPickerState | null
  tabsPickerKeyboardActive: boolean
  findPickerKeyboardActive: boolean
  domPickerKeyboardActive: boolean
  tabPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  findPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  domPickerInputRef: MutableRefObject<HTMLTextAreaElement | null>
  onAppendLog: (lines: string[]) => void | Promise<void>
  onRefreshTabPickerRows: () => Promise<void>
  onOpenFindEntry: (entry: PickerEntry) => void
  onDomApprove: () => void
}

/** EN: Layer ②+③ — open picker columns for one session leaf (registry-friendly). */
export function SessionPickerColumns({
  sessionId,
  paneFocus,
  activatePaneFocus,
  tabPicker,
  findListPicker,
  domListPicker,
  tabsPickerKeyboardActive,
  findPickerKeyboardActive,
  domPickerKeyboardActive,
  tabPickerInputRef,
  findPickerInputRef,
  domPickerInputRef,
  onAppendLog,
  onRefreshTabPickerRows,
  onOpenFindEntry,
  onDomApprove
}: SessionPickerColumnsProps) {
  return (
    <>
      {tabPicker ? (
        <PickerPanelHost
          focusTarget="tabs"
          paneFocus={paneFocus}
          onActivateFocus={() => activatePaneFocus("tabs")}>
          <TabsPickerWrapper
            rows={tabPicker.rows}
            showUrl={tabPicker.showUrl}
            initialHi={tabPicker.initialHi}
            variant={tabPicker.variant ?? "default"}
            onAppendLog={onAppendLog}
            onRefreshRows={onRefreshTabPickerRows}
            onReturnToPrompt={() => activatePaneFocus("terminal")}
            isHostPaneFocused={tabsPickerKeyboardActive}
            pickerInputRef={tabPickerInputRef}
            sessionId={sessionId}
          />
        </PickerPanelHost>
      ) : null}
      {findListPicker ? (
        <PickerPanelHost
          focusTarget="find"
          paneFocus={paneFocus}
          onActivateFocus={() => activatePaneFocus("find")}>
          <FindListPickerOverlay
            entries={findListPicker.entries}
            onReturnToPrompt={() => activatePaneFocus("terminal")}
            onOpenEntry={onOpenFindEntry}
            keyboardActive={findPickerKeyboardActive}
            pickerInputRef={findPickerInputRef}
            sessionId={sessionId}
          />
        </PickerPanelHost>
      ) : null}
      {domListPicker ? (
        <PickerPanelHost
          focusTarget="dom"
          paneFocus={paneFocus}
          onActivateFocus={() => activatePaneFocus("dom")}>
          <DomPickerWrapper
            state={domListPicker}
            onReturnToPrompt={() => activatePaneFocus("terminal")}
            keyboardActive={domPickerKeyboardActive}
            pickerInputRef={domPickerInputRef}
            sessionId={sessionId}
            onApprove={onDomApprove}
          />
        </PickerPanelHost>
      ) : null}
    </>
  )
}
