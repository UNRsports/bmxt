import { Fragment, type KeyboardEvent, type RefObject } from "react"
import { tTabs, type TabsMessageKey } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import { displayTitle } from "./picker-rows"
import { actionMenuTargetDividerColor } from "./tab-picker-action-menu"
import { NEW_GROUP_COLORS } from "./tab-picker-overlay-constants"
import { groupEditMenuItems, actionMenuItemsForKind } from "./tab-picker-overlay-constants"
import {
  bookmarkFolderRowCount,
  MAX_BOOKMARK_TITLE_LENGTH,
  MAX_BOOKMARK_URL_LENGTH
} from "./tab-picker-bookmark-model"
import type { ActionMenuPanel, BookmarkPanel, GroupChoice } from "./tab-picker-overlay-types"
import { resolveLiveTabFaviconSrc } from "./tab-picker-live-display"
import { resolveLiveTabTitle, resolveLiveTabUrl } from "./tab-picker-live-tab-fields"
import { TabPickerTabFavicon } from "./tab-picker-row-list"
import { useTabPickerLiveFieldsRevision } from "./use-tab-picker-live-fields-revision"

export function TabPickerActionMenuPanel({
  panelRef,
  actionMenuPanel
}: {
  panelRef: RefObject<HTMLDivElement | null>
  actionMenuPanel: ActionMenuPanel
}) {
  const { settings: uiSettings } = useUiSettings()
  useTabPickerLiveFieldsRevision()
  const items = actionMenuItemsForKind(actionMenuPanel.targetKind)
  return (
    <div
      ref={panelRef}
      className="bmxt-tab-picker-group-panel bmxt-tab-picker-action-menu-panel bmxt-tab-picker-action-menu-panel--overlay">
      <div className="bmxt-tab-picker-group-head">
        {tTabs("tabs.picker.actionMenuTitle", uiSettings.locale)}
      </div>
      {actionMenuPanel.tabTargets.length > 0 ? (
        <div className="bmxt-tab-picker-action-targets">
          {actionMenuPanel.tabTargets.map((target, idx) => {
            const liveTitle = resolveLiveTabTitle(target.tabId, target.title)
            const liveUrl = resolveLiveTabUrl(target.tabId, target.url)
            const titleShown = displayTitle(liveTitle)
            const faviconSrc = resolveLiveTabFaviconSrc(target.tabId, target.faviconSrc, liveUrl)
            const dividerColor = actionMenuTargetDividerColor(target.groupColor, idx)
            return (
              <Fragment key={target.tabId}>
                {idx > 0 ? (
                  <hr
                    className={`bmxt-tab-picker-action-target-divider bmxt-tab-picker-group-accent--${dividerColor}`}
                    aria-hidden
                  />
                ) : null}
                <div className="bmxt-tab-picker-action-target-row">
                  <div className="bmxt-tab-picker-tab-title">
                    {faviconSrc ? <TabPickerTabFavicon src={faviconSrc} /> : null}
                    <span className="bmxt-tab-picker-action-target-title">{titleShown}</span>
                  </div>
                </div>
              </Fragment>
            )
          })}
        </div>
      ) : null}
      <div className="bmxt-tab-picker-action-menu-items">
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

function BookmarkFolderList({
  panel,
  focusable
}: {
  panel: BookmarkPanel
  /** EN: Single-mode form makes the list a Tab stop (`folder` field). */
  focusable: boolean
}) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const rowCount = bookmarkFolderRowCount(panel)
  const activeId = `bmxt-bookmark-folder-${panel.folderPickIndex}`
  const focusProps = focusable ? { tabIndex: 0, "data-bmxt-bookmark-field": "folder" } : {}
  return (
    <div
      className="bmxt-tab-picker-bookmark-folder-list bmxt-scroll"
      role="listbox"
      aria-label={tTabs("tabs.picker.bookmark.folderLabel", locale)}
      aria-activedescendant={rowCount > 0 ? activeId : undefined}
      {...focusProps}>
      {!panel.foldersLoaded ? (
        <div className="bmxt-tab-picker-group-empty">
          {tTabs("tabs.picker.bookmark.loadingFolders", locale)}
        </div>
      ) : rowCount === 0 ? (
        <div className="bmxt-tab-picker-group-empty">
          {tTabs("tabs.picker.bookmark.noFolders", locale)}
        </div>
      ) : (
        <>
          {panel.mode === "multi" ? (
            <div
              id="bmxt-bookmark-folder-0"
              role="option"
              aria-selected={panel.folderPickIndex === 0}
              data-bmxt-bookmark-folder-pick={0}
              className={`bmxt-tab-picker-group-row${
                panel.folderPickIndex === 0 ? " bmxt-tab-picker-group-row--hi" : ""
              }`}>
              {tTabs("tabs.picker.bookmark.newFolderOption", locale)}
            </div>
          ) : null}
          {panel.folders.map((folder, idx) => {
            const pickIndex = panel.mode === "multi" ? idx + 1 : idx
            const highlighted = pickIndex === panel.folderPickIndex
            return (
              <div
                key={folder.id}
                id={`bmxt-bookmark-folder-${pickIndex}`}
                role="option"
                aria-selected={highlighted}
                data-bmxt-bookmark-folder-pick={pickIndex}
                className={`bmxt-tab-picker-group-row${
                  highlighted ? " bmxt-tab-picker-group-row--hi" : ""
                }`}>
                {folder.label}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export function TabPickerBookmarkPanel({
  panelRef,
  panel,
  onItemTitleChange,
  onItemUrlChange,
  onNewFolderNameChange
}: {
  panelRef: RefObject<HTMLDivElement | null>
  panel: BookmarkPanel
  onItemTitleChange: (index: number, value: string) => void
  onItemUrlChange: (index: number, value: string) => void
  onNewFolderNameChange: (value: string) => void
}) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const heading =
    panel.mode === "single"
      ? tTabs("tabs.picker.bookmark.panelTitle", locale)
      : tTabs("tabs.picker.bookmark.panelTitleMulti", locale, {
          count: String(panel.items.length)
        })

  return (
    <div
      ref={panelRef}
      className="bmxt-tab-picker-new-group-meta bmxt-tab-picker-bookmark-panel bmxt-scroll">
      <div className="bmxt-tab-picker-group-head">{heading}</div>

      {panel.phase === "folderPick" ? (
        <div className="bmxt-tab-picker-new-group-field">
          <div className="bmxt-tab-picker-new-group-label">
            {tTabs("tabs.picker.bookmark.folderLabel", locale)}
          </div>
          <BookmarkFolderList panel={panel} focusable={false} />
          {panel.skippedInvalidCount > 0 ? (
            <div className="bmxt-tab-picker-group-empty">
              {tTabs("tabs.picker.bookmark.skippedInvalid", locale, {
                count: String(panel.skippedInvalidCount)
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {panel.phase === "newFolder" ? (
        <div className="bmxt-tab-picker-new-group-field">
          <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-bookmark-new-folder">
            {tTabs("tabs.picker.bookmark.newFolderName", locale)}
          </label>
          <input
            id="bmxt-bookmark-new-folder"
            data-bmxt-bookmark-field="newFolder"
            className="bmxt-tab-picker-new-group-input"
            type="text"
            value={panel.newFolderName}
            maxLength={MAX_BOOKMARK_TITLE_LENGTH}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
        </div>
      ) : null}

      {panel.phase === "itemEdit" && panel.mode === "single" ? (
        <>
          {panel.items.map((item, index) => (
            <Fragment key={item.tabId}>
              <div className="bmxt-tab-picker-new-group-field">
                <label
                  className="bmxt-tab-picker-new-group-label"
                  htmlFor={`bmxt-bookmark-title-${index}`}>
                  {tTabs("tabs.picker.bookmark.titleLabel", locale)}
                </label>
                <input
                  id={`bmxt-bookmark-title-${index}`}
                  data-bmxt-bookmark-field="title"
                  className="bmxt-tab-picker-new-group-input"
                  type="text"
                  value={item.title}
                  maxLength={MAX_BOOKMARK_TITLE_LENGTH}
                  onChange={(e) => onItemTitleChange(index, e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                />
              </div>
              <div className="bmxt-tab-picker-new-group-field">
                <label
                  className="bmxt-tab-picker-new-group-label"
                  htmlFor={`bmxt-bookmark-url-${index}`}>
                  {tTabs("tabs.picker.bookmark.urlLabel", locale)}
                </label>
                <input
                  id={`bmxt-bookmark-url-${index}`}
                  data-bmxt-bookmark-field="url"
                  className="bmxt-tab-picker-new-group-input"
                  type="text"
                  value={item.url}
                  maxLength={MAX_BOOKMARK_URL_LENGTH}
                  onChange={(e) => onItemUrlChange(index, e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                />
              </div>
            </Fragment>
          ))}
          <div className="bmxt-tab-picker-new-group-field">
            <div className="bmxt-tab-picker-new-group-label">
              {tTabs("tabs.picker.bookmark.folderLabel", locale)}
            </div>
            <BookmarkFolderList panel={panel} focusable />
          </div>
        </>
      ) : null}

      {panel.phase === "itemEdit" && panel.mode === "multi" ? (
        <>
          <div className="bmxt-tab-picker-new-group-field">
            <div className="bmxt-tab-picker-new-group-label">
              {tTabs("tabs.picker.bookmark.folderLabel", locale)}
            </div>
            <div className="bmxt-tab-picker-group-empty">
              {panel.folderPickIndex === 0
                ? tTabs("tabs.picker.bookmark.newFolderSummary", locale, {
                    name: panel.newFolderName
                  })
                : (panel.folders[panel.folderPickIndex - 1]?.label ?? "")}
            </div>
          </div>
          {panel.items.map((item, index) => (
            <div key={item.tabId} className="bmxt-tab-picker-new-group-field">
              <label
                className="bmxt-tab-picker-new-group-label"
                htmlFor={`bmxt-bookmark-title-${index}`}>
                {item.url}
              </label>
              <input
                id={`bmxt-bookmark-title-${index}`}
                data-bmxt-bookmark-field="title"
                className="bmxt-tab-picker-new-group-input"
                type="text"
                value={item.title}
                maxLength={MAX_BOOKMARK_TITLE_LENGTH}
                onChange={(e) => onItemTitleChange(index, e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
              />
            </div>
          ))}
        </>
      ) : null}

      {panel.phase === "dupConfirm" ? (
        <div className="bmxt-tab-picker-new-group-field">
          <div className="bmxt-tab-picker-new-group-label">
            {tTabs("tabs.picker.bookmark.dupTitle", locale)}
          </div>
          {panel.duplicateUrls.map((url) => (
            <div key={url} className="bmxt-tab-picker-group-row">
              {url}
            </div>
          ))}
          <div className="bmxt-tab-picker-group-empty">
            {tTabs("tabs.picker.bookmark.dupHint", locale)}
          </div>
        </div>
      ) : null}

      {panel.errorMessage !== null ? (
        <div className="bmxt-tab-picker-bookmark-error" role="alert">
          {panel.errorMessage}
        </div>
      ) : null}
    </div>
  )
}
