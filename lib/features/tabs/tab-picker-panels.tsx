import type { KeyboardEvent, RefObject } from "react"
import { tTabs, type TabsMessageKey } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import { NEW_GROUP_COLORS } from "./tab-picker-overlay-constants"
import { groupEditMenuItems, actionMenuItemsForKind } from "./tab-picker-overlay-constants"
import type { ActionMenuPanel, GroupChoice } from "./tab-picker-overlay-types"

export function TabPickerActionMenuPanel({
  panelRef,
  actionMenuPanel
}: {
  panelRef: RefObject<HTMLDivElement | null>
  actionMenuPanel: ActionMenuPanel
}) {
  const { settings: uiSettings } = useUiSettings()
  const items = actionMenuItemsForKind(actionMenuPanel.targetKind)
  return (
    <div
      ref={panelRef}
      className="bmxt-tab-picker-group-panel bmxt-tab-picker-action-menu-panel">
      <div className="bmxt-tab-picker-group-head">
        {tTabs("tabs.picker.actionMenuTitle", uiSettings.locale)}
      </div>
      {actionMenuPanel.tabLabels.length > 0 ? (
        <div className="bmxt-tab-picker-action-targets">
          {actionMenuPanel.tabLabels.map((label, idx) => (
            <div key={`${idx}-${label}`} className="bmxt-tab-picker-action-target-row">
              {label}
            </div>
          ))}
        </div>
      ) : null}
      {items.map((item, idx) => (
        <div
          key={item.id}
          data-bmxt-action-pick={idx}
          className={`bmxt-tab-picker-group-row${
            idx === actionMenuPanel.pickIndex ? " bmxt-tab-picker-group-row--hi" : ""
          }`}>
          {tTabs(item.messageKey as TabsMessageKey, uiSettings.locale)}
        </div>
      ))}
    </div>
  )
}

export function TabPickerGroupTargetPanel({
  panelRef,
  groupChoices,
  groupPickIndex
}: {
  panelRef: RefObject<HTMLDivElement>
  groupChoices: GroupChoice[]
  groupPickIndex: number
}) {
  const { settings: uiSettings } = useUiSettings()
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.targetGroups", uiSettings.locale)}</div>
      {groupChoices.length === 0 ? (
        <div className="bmxt-tab-picker-group-empty">{tTabs("tabs.picker.loadingGroups", uiSettings.locale)}</div>
      ) : (
        groupChoices.map((g, idx) => (
          <div
            key={`${g.id}-${idx}`}
            data-bmxt-group-pick={idx}
            className={`bmxt-tab-picker-group-row${
              idx === groupPickIndex ? " bmxt-tab-picker-group-row--hi" : ""
            }`}>
            {g.label}
          </div>
        ))
      )}
    </div>
  )
}

export function TabPickerNewGroupMetaPanel({
  groupMetaTitleRef,
  groupMetaColorStripRef,
  newGroupTitle,
  onNewGroupTitleChange,
  newGroupColorIndex,
  onMetaTitleKeyDown,
  onMetaColorKeyDown
}: {
  groupMetaTitleRef: RefObject<HTMLInputElement>
  groupMetaColorStripRef: RefObject<HTMLDivElement>
  newGroupTitle: string
  onNewGroupTitleChange: (value: string) => void
  newGroupColorIndex: number
  onMetaTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onMetaColorKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const { settings: uiSettings } = useUiSettings()
  const activeColor = NEW_GROUP_COLORS[newGroupColorIndex]
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.newGroup", uiSettings.locale)}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-group-title">
          {tTabs("tabs.picker.nameLabel", uiSettings.locale)}
        </label>
        <input
          id="bmxt-new-group-title"
          ref={groupMetaTitleRef}
          className="bmxt-tab-picker-new-group-input"
          type="text"
          value={newGroupTitle}
          onChange={(e) => onNewGroupTitleChange(e.target.value)}
          onKeyDown={onMetaTitleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
      <div className="bmxt-tab-picker-new-group-field">
        <div className="bmxt-tab-picker-new-group-label">{tTabs("tabs.picker.colorLabel", uiSettings.locale)}</div>
        <div
          ref={groupMetaColorStripRef}
          className="bmxt-tab-picker-color-strip"
          tabIndex={0}
          role="listbox"
          aria-label={tTabs("tabs.picker.groupColorAria", uiSettings.locale)}
          aria-activedescendant={`bmxt-color-${activeColor}`}
          onKeyDown={onMetaColorKeyDown}>
          {NEW_GROUP_COLORS.map((c, i) => (
            <span
              key={c}
              id={`bmxt-color-${c}`}
              className={`bmxt-tab-picker-color-swatch bmxt-tab-picker-color-swatch--${c}${
                i === newGroupColorIndex ? " bmxt-tab-picker-color-swatch--hi" : ""
              }`}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TabPickerEditWindowRenamePanel({
  titleRef,
  editTitle,
  onEditTitleChange,
  onKeyDown
}: {
  titleRef: RefObject<HTMLInputElement | null>
  editTitle: string
  onEditTitleChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  const { settings: uiSettings } = useUiSettings()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.editWindowName", uiSettings.locale)}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-window-title">
          {tTabs("tabs.picker.nameLabel", uiSettings.locale)}
        </label>
        <input
          id="bmxt-edit-window-title"
          ref={titleRef}
          className="bmxt-tab-picker-new-group-input"
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  )
}

export function TabPickerEditGroupMenuPanel({
  panelRef,
  pickIndex
}: {
  panelRef: RefObject<HTMLDivElement | null>
  pickIndex: number
}) {
  const { settings: uiSettings } = useUiSettings()
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.editGroupMenu", uiSettings.locale)}</div>
      {groupEditMenuItems().map((item, idx) => (
        <div
          key={item.id}
          data-bmxt-edit-pick={idx}
          className={`bmxt-tab-picker-group-row${
            idx === pickIndex ? " bmxt-tab-picker-group-row--hi" : ""
          }`}>
          {tTabs(item.messageKey as TabsMessageKey, uiSettings.locale)}
        </div>
      ))}
    </div>
  )
}

export function TabPickerEditGroupRenamePanel({
  titleRef,
  editTitle,
  onEditTitleChange,
  onKeyDown
}: {
  titleRef: RefObject<HTMLInputElement | null>
  editTitle: string
  onEditTitleChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  const { settings: uiSettings } = useUiSettings()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.editGroupName", uiSettings.locale)}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-group-title">
          {tTabs("tabs.picker.nameLabel", uiSettings.locale)}
        </label>
        <input
          id="bmxt-edit-group-title"
          ref={titleRef}
          className="bmxt-tab-picker-new-group-input"
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  )
}

export function TabPickerNewTabUrlPanel({
  groupMetaTitleRef,
  newTabUrl,
  onNewTabUrlChange,
  onKeyDown
}: {
  groupMetaTitleRef: RefObject<HTMLInputElement | null>
  newTabUrl: string
  onNewTabUrlChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  const { settings: uiSettings } = useUiSettings()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{tTabs("tabs.picker.newTabPanel", uiSettings.locale)}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-tab-url">
          {tTabs("tabs.picker.urlLabel", uiSettings.locale)}
        </label>
        <input
          id="bmxt-new-tab-url"
          ref={groupMetaTitleRef}
          className="bmxt-tab-picker-new-group-input"
          type="text"
          value={newTabUrl}
          onChange={(e) => onNewTabUrlChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  )
}
