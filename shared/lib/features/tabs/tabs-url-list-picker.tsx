import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerListShell } from "../side-picker/chrome/picker-list-shell"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { tPlainPicker } from "../setting/i18n/ns/plain-picker"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  TabPickerActionMenuPanel,
  TabPickerBookmarkPanel,
  TabPickerEditGroupMenuPanel,
  TabPickerEditGroupRenamePanel,
  TabPickerEditWindowRenamePanel,
  TabPickerGroupTargetPanel,
  TabPickerNewGroupMetaPanel,
  TabPickerNewTabUrlPanel
} from "./tab-picker-panels"
import { TabPickerRowList } from "./tab-picker-row-list"
import type { TabPickerViewProps } from "./tab-picker-view-types"
import { TAB_PICKER_COMMAND_COMPLETIONS } from "./tab-picker-overlay-constants"

export type { TabPickerViewProps } from "./tab-picker-view-types"

/** EN: Tabs column on UrlList picker shell (hierarchical list + bulk/edit panels). */
export function TabsUrlListPicker(props: TabPickerViewProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const {
    headLine,
    searchHighlightQuery,
    setInputEl,
    onInputKeyDown,
    onMetaTitleKeyDown,
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    bulkSubMode,
    markedKind,
    markedWindowSet,
    markedGroupSet,
    markedTabSet,
    activeTabId,
    trackedWindowId,
    trackedWindowTitle,
    showUrl,
    setRowRef,
    isWindowExpanded,
    isGroupExpanded,
    variant,
    groupNewPhase,
    groupPanelRef,
    groupChoices,
    groupPickIndex,
    newTabUrlWindowId,
    groupMetaTitleRef,
    newTabUrl,
    setNewTabUrl,
    editPanel,
    actionMenuPanel,
    actionMenuPanelRef,
    bookmarkPanel,
    bookmarkPanelRef,
    onBookmarkItemTitleChange,
    onBookmarkItemUrlChange,
    onBookmarkNewFolderNameChange,
    groupMetaColorStripRef,
    newGroupTitle,
    setNewGroupTitle,
    newGroupColorIndex,
    onMetaColorKeyDown,
    editTitle,
    setEditTitle,
    editPanelRef,
    searchMode,
    filterQuery,
    setFilterQuery,
    commandMode,
    commandBuffer,
    setCommandBuffer,
    commandListingHint,
    isHostPaneFocused,
    inputRef,
    peerNoticeLines
  } = props

  const peerNoticeFooter =
    peerNoticeLines.length > 0 ? (
      <div className="bmxt-picker-peer-footer" role="status">
        {peerNoticeLines.map((line, i) => (
          <div key={`peer-notice-${i}`} className="bmxt-picker-peer-footer-line">
            {line}
          </div>
        ))}
      </div>
    ) : null

  const panelFooter =
    actionMenuPanel !== null
      ? null
      : bookmarkPanel !== null ? (
      <TabPickerBookmarkPanel
        panelRef={bookmarkPanelRef}
        panel={bookmarkPanel}
        onItemTitleChange={onBookmarkItemTitleChange}
        onItemUrlChange={onBookmarkItemUrlChange}
        onNewFolderNameChange={onBookmarkNewFolderNameChange}
      />
    ) : bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
      <TabPickerGroupTargetPanel
        panelRef={groupPanelRef}
        groupChoices={groupChoices}
        groupPickIndex={groupPickIndex}
      />
    ) : newTabUrlWindowId !== null ? (
      <TabPickerNewTabUrlPanel
        groupMetaTitleRef={groupMetaTitleRef}
        newTabUrl={newTabUrl}
        onNewTabUrlChange={setNewTabUrl}
        onKeyDown={onMetaTitleKeyDown}
      />
    ) : groupNewPhase === "meta" ? (
      <TabPickerNewGroupMetaPanel
        groupMetaTitleRef={groupMetaTitleRef}
        groupMetaColorStripRef={groupMetaColorStripRef}
        newGroupTitle={newGroupTitle}
        onNewGroupTitleChange={setNewGroupTitle}
        newGroupColorIndex={newGroupColorIndex}
        onMetaTitleKeyDown={onMetaTitleKeyDown}
        onMetaColorKeyDown={onMetaColorKeyDown}
      />
    ) : editPanel?.kind === "windowRename" ? (
      <TabPickerEditWindowRenamePanel
        titleRef={groupMetaTitleRef}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        onKeyDown={onMetaTitleKeyDown}
      />
    ) : editPanel?.kind === "groupRename" ? (
      <TabPickerEditGroupRenamePanel
        titleRef={groupMetaTitleRef}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        onKeyDown={onMetaTitleKeyDown}
      />
    ) : editPanel?.kind === "groupMenu" ? (
      <TabPickerEditGroupMenuPanel panelRef={editPanelRef} pickIndex={editPanel.pickIndex} />
    ) : null

  const extraFooter =
    peerNoticeFooter !== null || panelFooter !== null ? (
      <>
        {peerNoticeFooter}
        {panelFooter}
      </>
    ) : null

  return (
    <div className="bmxt-tab-picker-action-menu-host">
      <PickerListShell
        headline={headLine}
        keyboardActive={isHostPaneFocused}
        searchMode={searchMode}
        commandMode={commandMode}
        filterQuery={filterQuery}
        commandBuffer={commandBuffer}
        setInputEl={setInputEl}
        onInputKeyDown={onInputKeyDown}
        onInputChange={(value) => {
          if (searchMode) {
            setFilterQuery(value)
          } else if (commandMode) {
            setCommandBuffer(value)
          }
        }}
        onCompositionEndSearch={
          searchMode ? (value) => setFilterQuery(value) : undefined
        }
        inputAriaLabel={
          searchMode
            ? tPlainPicker("plainPicker.searchHint", locale)
            : commandMode
              ? tTabs("tabs.picker.inputAria.command", locale)
              : tTabs("tabs.picker.inputAria.keys", locale)
        }
        listAriaLabel={tTabs("tabs.picker.listAria", locale)}
        listAriaMultiselectable
        listActivedescendant={
          visibleRowIndices[hi] !== undefined ? `bmxt-tab-row-${visibleRowIndices[hi]}` : undefined
        }
        listBody={
          <TabPickerRowList
            rows={rows}
            visibleRowIndices={visibleRowIndices}
            hi={hi}
            moveDestHi={moveDestHi}
            bulkSubMode={bulkSubMode}
            markedKind={markedKind}
            markedWindowSet={markedWindowSet}
            markedGroupSet={markedGroupSet}
            markedTabSet={markedTabSet}
            activeTabId={activeTabId}
            trackedWindowId={trackedWindowId}
            trackedWindowTitle={trackedWindowTitle}
            showUrl={showUrl}
            searchHighlightQuery={searchHighlightQuery}
            setRowRef={setRowRef}
            isWindowExpanded={isWindowExpanded}
            isGroupExpanded={isGroupExpanded}
          />
        }
        extraFooter={extraFooter}
        searchFooter={searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
        commandFooter={
          commandMode ? (
            <PickerCommandFooter
              commandBuffer={commandBuffer}
              showListingHint={commandListingHint}
              listingHintText={TAB_PICKER_COMMAND_COMPLETIONS.join("  ")}
              ambiguousPlaceholder={null}
            />
          ) : null
        }
        inputRef={inputRef}
      />
      {actionMenuPanel !== null ? (
        <TabPickerActionMenuPanel panelRef={actionMenuPanelRef} actionMenuPanel={actionMenuPanel} />
      ) : null}
    </div>
  )
}
