import type { KeyboardEvent, RefObject } from "react"
import {
  COLOR_SWATCH_BG,
  NEW_GROUP_COLORS,
  type NewGroupPaletteColor
} from "./tab-picker-overlay-constants"
import { GROUP_EDIT_MENU_ITEMS } from "./tab-picker-overlay-constants"
import type { GroupChoice } from "./tab-picker-overlay-types"

export function TabPickerGroupTargetPanel({
  panelRef,
  groupChoices,
  groupPickIndex
}: {
  panelRef: RefObject<HTMLDivElement>
  groupChoices: GroupChoice[]
  groupPickIndex: number
}) {
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">Target groups</div>
      {groupChoices.length === 0 ? (
        <div className="bmxt-tab-picker-group-empty">(読み込み中…)</div>
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
  const activeColor = NEW_GROUP_COLORS[newGroupColorIndex]
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">新しいグループ</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-group-title">
          名前
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
        <div className="bmxt-tab-picker-new-group-label">色（← →）</div>
        <div
          ref={groupMetaColorStripRef}
          className="bmxt-tab-picker-color-strip"
          tabIndex={0}
          role="listbox"
          aria-label="グループの色"
          aria-activedescendant={`bmxt-color-${activeColor}`}
          onKeyDown={onMetaColorKeyDown}>
          {NEW_GROUP_COLORS.map((c, i) => (
            <span
              key={c}
              id={`bmxt-color-${c}`}
              className={`bmxt-tab-picker-color-swatch${
                i === newGroupColorIndex ? " bmxt-tab-picker-color-swatch--hi" : ""
              }`}
              style={{
                background: COLOR_SWATCH_BG[c as NewGroupPaletteColor] ?? "#484f58"
              }}
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
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">ウィンドウ名</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-window-title">
          名前
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
  return (
    <div ref={panelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">タブグループの編集</div>
      {GROUP_EDIT_MENU_ITEMS.map((item, idx) => (
        <div
          key={item.id}
          data-bmxt-edit-pick={idx}
          className={`bmxt-tab-picker-group-row${
            idx === pickIndex ? " bmxt-tab-picker-group-row--hi" : ""
          }`}>
          {item.label}
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
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">グループ名</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-edit-group-title">
          名前
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
  return (
    <div className="bmxt-tab-picker-new-group-meta">
      <div className="bmxt-tab-picker-group-head">新しいタブ</div>
      <div className="bmxt-tab-picker-new-group-field">
        <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-tab-url">
          URL
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
