import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
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

export function TabPickerView(props: TabPickerViewProps) {
  const {
    headLine, searchHighlightQuery, commandListingHintText, commandAmbiguousPlaceholder,
    setInputEl, onInputKeyDown, onMetaTitleKeyDown, rows, visibleRowIndices, hi, moveDestHi,
    bulkSubMode, markedWindowSet, markedGroupSet, markedTabSet, activeTabId, showUrl, setRowRef,
    variant, groupNewPhase, groupPanelRef, groupChoices, groupPickIndex, newTabUrlWindowId,
    groupMetaTitleRef, newTabUrl, setNewTabUrl, editPanel, groupMetaColorStripRef, newGroupTitle,
    setNewGroupTitle, newGroupColorIndex, onMetaColorKeyDown, editTitle, setEditTitle, editPanelRef,
    searchMode, filterQuery, setFilterQuery, commandMode, commandBuffer, setCommandBuffer,
    setCommandListingHint, commandListingHint, isHostPaneFocused, inputRef
  } = props

  return (
<div
      className="bmxt-tab-picker bmxt-side-picker"
      onMouseDown={(ev) => {
        const t = ev.target as HTMLElement
        if (t.closest(".bmxt-tab-picker-new-group-meta")) {
          return
        }
        if (
          groupNewPhase === "meta" ||
          newTabUrlWindowId !== null ||
          editPanel !== null
        ) {
          return
        }
        if (!isHostPaneFocused) {
          return
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      }}>
      <div className="bmxt-tab-picker-head">{headLine}</div>
      <textarea
        ref={setInputEl}
        className="bmxt-tab-picker-filter-ime"
        rows={1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={
          searchMode ? "Search highlight" : commandMode ? "Command input" : "Tab picker key input"
        }
        value={searchMode ? filterQuery : commandMode ? commandBuffer : ""}
        onChange={(e) => {
          if (searchMode) {
            setFilterQuery(e.target.value)
          } else if (commandMode) {
            const v = e.target.value
            setCommandBuffer(v)
            if (v.trim() !== "") {
              setCommandListingHint(false)
            }
          }
        }}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={(e) => {
          if (searchMode) {
            setFilterQuery(e.currentTarget.value)
          }
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Tabs"
        aria-multiselectable={true}
        aria-activedescendant={
          visibleRowIndices[hi] !== undefined ? `bmxt-tab-row-${visibleRowIndices[hi]}` : undefined
        }>
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
          showUrl={showUrl}
          searchHighlightQuery={searchHighlightQuery}
          setRowRef={setRowRef}
        />
      </div>
      {bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
        <TabPickerGroupTargetPanel
          panelRef={groupPanelRef}
          groupChoices={groupChoices}
          groupPickIndex={groupPickIndex}
        />
      ) : null}
      {newTabUrlWindowId !== null ? (
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
        <TabPickerEditGroupMenuPanel
          panelRef={editPanelRef}
          pickIndex={editPanel.pickIndex}
        />
      ) : null}
      {searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <PickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={commandListingHintText}
          ambiguousPlaceholder={commandAmbiguousPlaceholder}
        />
      ) : null}
    </div>
  )
}
