import type { MutableRefObject, ReactNode } from "react"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { FindListPickerState } from "../../find/find-list-picker-input"
import { FindListPickerOverlay } from "../../find/find-list-picker-overlay"
import type { PickerEntry } from "../model/picker-entry"
import type { PaneFocusTarget } from "../panel/pane-focus-nav"
import { PickerPanelHost } from "../panel/picker-panel-host"
import type { PickerSlotId } from "../session/session-pickers"
import type { TabPickerState } from "../session/tab-picker-state"
import { DomPickerWrapper } from "./dom-picker-wrapper"
import { TabsPickerWrapper } from "./tabs-picker-wrapper"

export type SessionPickerColumnsProps = PickerColumnHostContext

export type PickerColumnHostContext = {
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
  onOpenFindEntry: (entry: PickerEntry, matchIndex: number) => void
  onDomApprove: () => void
  onTabsPickerFocusTabId?: (tabId: number | null) => void
}

type SlotRenderer = (ctx: PickerColumnHostContext) => ReactNode

const PICKER_SLOT_RENDERERS: Record<PickerSlotId, SlotRenderer> = {
  tabs: (ctx) =>
    ctx.tabPicker ? (
      <PickerPanelHost focusTarget="tabs" paneFocus={ctx.paneFocus}>
        <TabsPickerWrapper
          rows={ctx.tabPicker.rows}
          showUrl={ctx.tabPicker.showUrl}
          initialHi={ctx.tabPicker.initialHi}
          variant={ctx.tabPicker.variant ?? "default"}
          onAppendLog={ctx.onAppendLog}
          onRefreshRows={ctx.onRefreshTabPickerRows}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          isHostPaneFocused={ctx.tabsPickerKeyboardActive}
          pickerInputRef={ctx.tabPickerInputRef}
          sessionId={ctx.sessionId}
          onFocusTabIdChange={ctx.onTabsPickerFocusTabId}
        />
      </PickerPanelHost>
    ) : null,
  find: (ctx) =>
    ctx.findListPicker ? (
      <PickerPanelHost focusTarget="find" paneFocus={ctx.paneFocus}>
        <FindListPickerOverlay
          entries={ctx.findListPicker.entries}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          onOpenEntry={(entry, matchIndex) => ctx.onOpenFindEntry(entry, matchIndex)}
          keyboardActive={ctx.findPickerKeyboardActive}
          pickerInputRef={ctx.findPickerInputRef}
          sessionId={ctx.sessionId}
        />
      </PickerPanelHost>
    ) : null,
  dom: (ctx) =>
    ctx.domListPicker ? (
      <PickerPanelHost focusTarget="dom" paneFocus={ctx.paneFocus}>
        <DomPickerWrapper
          state={ctx.domListPicker}
          onReturnToPrompt={() => ctx.activatePaneFocus("terminal")}
          keyboardActive={ctx.domPickerKeyboardActive}
          pickerInputRef={ctx.domPickerInputRef}
          sessionId={ctx.sessionId}
          onApprove={ctx.onDomApprove}
        />
      </PickerPanelHost>
    ) : null
}

/** EN: Render one picker column by slot id (②+③). */
export function renderPickerSlot(slot: PickerSlotId, ctx: PickerColumnHostContext): ReactNode {
  return PICKER_SLOT_RENDERERS[slot](ctx)
}

export const PICKER_SLOT_ORDER: readonly PickerSlotId[] = ["tabs", "find", "dom"]
