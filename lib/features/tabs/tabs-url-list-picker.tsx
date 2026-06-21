import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerListShell } from "../side-picker/chrome/picker-list-shell"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { useUiCopy } from "../setting"
import {
  TabPickerEditGroupMenuPanel,
  TabPickerEditGroupRenamePanel,
  TabPickerEditWindowRenamePanel,
  TabPickerGroupTargetPanel,
  TabPickerNewGroupMetaPanel,
  TabPickerNewTabUrlPanel
} from "./tab-picker-panels"
import { TabPickerRowList } from "./tab-picker-row-list"
import type { TabPickerViewProps } from "./tab-picker-view-types"

export type { TabPickerViewProps } from "./tab-picker-view-types"

/** EN: Tabs column on UrlList picker shell (hierarchical list + bulk/edit panels). */
export function TabsUrlListPicker(props: TabPickerViewProps) {
  const uiCopy = useUiCopy()
  const {
    headLine,
    searchHighlightQuery,
    commandListingHintText,
    commandAmbiguousPlaceholder,
    setInputEl,
    onInputKeyDown,
    onMetaTitleKeyDown,
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    bulkSubMode,
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
    setCommandListingHint,
    commandListingHint,
    isHostPaneFocused,
    inputRef
  } = props

  const extraFooter =
    bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
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

  return (
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
          if (value.trim() !== "") {
            setCommandListingHint(false)
          }
        }
      }}
      onCompositionEndSearch={
        searchMode ? (value) => setFilterQuery(value) : undefined
      }
      inputAriaLabel={
        searchMode
          ? uiCopy.t("plainPicker.searchHint")
          : commandMode
            ? uiCopy.t("plainPicker.commandHint")
            : uiCopy.t("tabs.picker.inputAria.keys")
      }
      listAriaLabel={uiCopy.t("tabs.picker.listAria")}
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
            listingHintText={commandListingHintText}
            ambiguousPlaceholder={commandAmbiguousPlaceholder}
          />
        ) : null
      }
      inputRef={inputRef}
    />
  )
}
