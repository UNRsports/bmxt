import { PickerListShell } from "../side-picker/chrome/picker-list-shell"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import {
  TabPickerEditGroupMenuPanel,
  TabPickerEditGroupRenamePanel,
  TabPickerEditWindowRenamePanel,
  TabPickerGroupTargetPanel,
  TabPickerNewGroupMetaPanel,
  TabPickerNewTabUrlPanel
} from "./tab-picker-panels"
import { TabPickerActionPickerRow } from "./tab-picker-action-picker-row"
import { TabPickerBreadcrumb } from "./tab-picker-breadcrumb"
import { TabPickerRowList } from "./tab-picker-row-list"
import type { TabPickerViewProps } from "./tab-picker-view-types"

export type { TabPickerViewProps } from "./tab-picker-view-types"

/** EN: Tabs column on UrlList picker shell (hierarchical list + bulk/edit panels). */
export function TabsUrlListPicker(props: TabPickerViewProps) {
  const {
    headLine,
    searchHighlightQuery,
    pickerView,
    actionHi,
    actionRows,
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
    isHostPaneFocused,
    inputRef
  } = props

  const inActionView = pickerView === "actions"

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

  const listBody = inActionView ? (
    actionRows.length === 0 ? (
      <div className="bmxt-tab-picker-empty">(no output)</div>
    ) : (
      actionRows.map((row, i) => (
        <TabPickerActionPickerRow key={row.id} index={i} label={row.label} hi={actionHi} />
      ))
    )
  ) : (
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
  )

  return (
    <PickerListShell
      headline={headLine}
      keyboardActive={isHostPaneFocused}
      searchMode={searchMode}
      commandMode={false}
      filterQuery={filterQuery}
      commandBuffer=""
      setInputEl={setInputEl}
      onInputKeyDown={onInputKeyDown}
      onInputChange={(value) => {
        if (searchMode) {
          setFilterQuery(value)
        }
      }}
      onCompositionEndSearch={
        searchMode ? (value) => setFilterQuery(value) : undefined
      }
      inputAriaLabel={searchMode ? "Search highlight" : "Tab picker key input"}
      listAriaLabel={inActionView ? "Tab actions" : "Tabs"}
      listAriaMultiselectable={!inActionView}
      listActivedescendant={
        inActionView
          ? `bmxt-tab-action-row-${actionHi}`
          : visibleRowIndices[hi] !== undefined
            ? `bmxt-tab-row-${visibleRowIndices[hi]}`
            : undefined
      }
      listPrefix={<TabPickerBreadcrumb view={pickerView} />}
      listBody={listBody}
      extraFooter={extraFooter}
      searchFooter={searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      inputRef={inputRef}
    />
  )
}
