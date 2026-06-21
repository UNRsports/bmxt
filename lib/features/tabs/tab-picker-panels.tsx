import type { KeyboardEvent, RefObject } from "react"
import { useUiCopy } from "../setting"
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
  const uiCopy = useUiCopy()
  const items = actionMenuItemsForKind(actionMenuPanel.targetKind)
  return (
    <div
      ref={panelRef}
      className="bmxt-tab-picker-group-panel bmxt-tab-picker-action-menu-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.actionMenuTitle")}</div>
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
          {uiCopy.t(item.messageKey)}
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
  const uiCopy = useUiCopy()
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.targetGroups")}</div>
      {groupChoices.length === 0 ? (
        <div className="bmxt-tab-picker-group-empty">{uiCopy.t("tabs.picker.loadingGroups")}</div>
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
  const uiCopy = useUiCopy()
  const activeColor = NEW_GROUP_COLORS[newGroupColorIndex]
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.newGroup")}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-group-title">
          {uiCopy.t("tabs.picker.nameLabel")}
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
        <div className="bmxt-tab-picker-new-group-label">{uiCopy.t("tabs.picker.colorLabel")}</div>
        <div
          ref={groupMetaColorStripRef}
          className="bmxt-tab-picker-color-strip"
          tabIndex={0}
          role="listbox"
          aria-label={uiCopy.t("tabs.picker.groupColorAria")}
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
  const uiCopy = useUiCopy()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.editWindowName")}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-window-title">
          {uiCopy.t("tabs.picker.nameLabel")}
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
  const uiCopy = useUiCopy()
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.editGroupMenu")}</div>
      {groupEditMenuItems().map((item, idx) => (
        <div
          key={item.id}
          data-bmxt-edit-pick={idx}
          className={`bmxt-tab-picker-group-row${
            idx === pickIndex ? " bmxt-tab-picker-group-row--hi" : ""
          }`}>
          {uiCopy.t(item.messageKey)}
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
  const uiCopy = useUiCopy()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.editGroupName")}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-group-title">
          {uiCopy.t("tabs.picker.nameLabel")}
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
  const uiCopy = useUiCopy()
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">{uiCopy.t("tabs.picker.newTabPanel")}</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-tab-url">
          {uiCopy.t("tabs.picker.urlLabel")}
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
