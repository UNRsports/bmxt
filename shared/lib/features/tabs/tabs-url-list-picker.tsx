import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerListShell } from "../side-picker/chrome/picker-list-shell"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { tPlainPicker } from "../setting/i18n/ns/plain-picker"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  TabPickerActionMenuPanel,
  TabPickerEditGroupMenuPanel,
  TabPickerEditGroupRenamePanel,
  TabPickerEditWindowRenamePanel,
  TabPickerGroupTargetPanel,
  TabPickerNewGroupMetaPanel,
  TabPickerNewTabUrlPanel
} from "./tab-picker-panels"
import { TabPickerRowList } from "./tab-picker-row-list"
import type { TabPickerViewProps } from "./tab-picker-view-types"
import { TAB_PICKER_COMMANDS_FOR_TAB } from "./tab-picker-overlay-constants"
import { familyPeerAtMoveDest } from "./family-move-dest"

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
    moveCloseAfter,
    familyPeers,
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
    inputRef
  } = props

  const familyDestPeer =
    bulkSubMode === "move"
      ? familyPeerAtMoveDest(moveDestHi, visibleRowIndices.length, familyPeers)
      : null

  const extraFooter =
    actionMenuPanel !== null
      ? null
      : bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
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
    ) : bulkSubMode === "move" && familyPeers.length > 0 ? (
      <div className="bmxt-tab-picker-family-dest" aria-label={tTabs("tabs.picker.family.destList", locale)}>
        {familyPeers.map((peer, index) => {
          const destHi = visibleRowIndices.length + index
          const selected = moveDestHi === destHi
          return (
            <div
              key={peer.deviceId}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--family${
                selected ? " bmxt-tab-picker-row--move-dest" : ""
              }`}>
              <span className="bmxt-tab-picker-tab-glyph"> </span>
              {tTabs("tabs.picker.family.destRow", locale, {
                name: peer.displayName,
                mode: moveCloseAfter
                  ? tTabs("tabs.picker.family.modeClose", locale)
                  : tTabs("tabs.picker.family.modeCopy", locale)
              })}
            </div>
          )
        })}
        {familyDestPeer !== null ? (
          <div className="bmxt-tab-picker-family-dest-hint">
            {moveCloseAfter
              ? tTabs("tabs.picker.family.hintClose", locale, { name: familyDestPeer.displayName })
              : tTabs("tabs.picker.family.hintCopy", locale, { name: familyDestPeer.displayName })}
          </div>
        ) : null}
      </div>
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
              listingHintText={TAB_PICKER_COMMANDS_FOR_TAB.join("  ")}
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
