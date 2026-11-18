/**
 * EN: Tab-picker "add to bookmarks" flow (action menu `bookmark` / `:bookmark`).
 *     Phases: folderPick (multi) → newFolder (multi, optional) → itemEdit → dupConfirm (optional) → create.
 *     Local tabs only. All keys are handled in the window-capture chain via `handleBookmarkKeydown`.
 * JA: タブピッカーの「ブックマークに追加」フロー。ローカルタブのみ。
 */

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import { findBookmarksByUrl, listBookmarkFolders, sanitizeBookmarkParentId } from "../bookmark/folders"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { UiLocale } from "../setting/locale"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import type { TabPickerEngineDispatch } from "./engine/types"
import type { TabPickerRow } from "./picker-rows"
import { resolveActionMenuTabTargets, resolveActionMenuTargetKind } from "./tab-picker-action-menu"
import {
  type BookmarkItemValidationFailure,
  bookmarkFolderRowCount,
  buildBookmarkDrafts,
  buildBookmarkFolderOptions,
  defaultBookmarkFolderIndex,
  isNewBookmarkFolderSelected,
  selectedBookmarkFolder,
  validateBookmarkItems,
  validateNewBookmarkFolderName,
  wrapIndex
} from "./tab-picker-bookmark-model"
import { getPickerRowAtHi } from "./tab-picker-bulk-window"
import { resolveLiveTabTitle, resolveLiveTabUrl } from "./tab-picker-live-tab-fields"
import type {
  ActionMenuTabTarget,
  BookmarkItemDraft,
  BookmarkPanel,
  BookmarkPanelMode,
  SelectKind
} from "./tab-picker-overlay-types"

const FIELD_SELECTOR = "[data-bmxt-bookmark-field]"
const URL_PREVIEW_MAX = 80

export type TabPickerBookmarkParams = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bookmarkPanel: BookmarkPanel | null
  bookmarkPanelRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLTextAreaElement | null>
  dispatch: TabPickerEngineDispatch
  clearMarkedViaReducer: () => void
  onAppendLog?: (lines: string[]) => void | Promise<void>
}

export type TabPickerBookmarkApi = {
  openBookmarkPanelForTargets: (targets: readonly ActionMenuTabTarget[]) => void
  openBookmarkFromPicker: () => void
  closeBookmarkPanel: () => void
  /** EN: Window-capture handler; returns true when the picker key chain must stop. */
  handleBookmarkKeydown: (e: KeyboardEvent) => boolean
  onBookmarkItemTitleChange: (index: number, value: string) => void
  onBookmarkItemUrlChange: (index: number, value: string) => void
  onBookmarkNewFolderNameChange: (value: string) => void
}

function validationFailureText(failure: BookmarkItemValidationFailure, locale: UiLocale): string {
  const key =
    failure.reason === "invalidUrl"
      ? "tabs.picker.bookmark.error.invalidUrl"
      : "tabs.picker.bookmark.error.urlTooLong"
  return tTabs(key, locale, { url: failure.url.slice(0, URL_PREVIEW_MAX) })
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function useTabPickerBookmark(p: TabPickerBookmarkParams): TabPickerBookmarkApi {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const {
    rows,
    visibleRowIndices,
    hi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    bookmarkPanel,
    bookmarkPanelRef,
    inputRef,
    dispatch,
    clearMarkedViaReducer,
    onAppendLog
  } = p

  /** EN: Guards overlapping async dup-check / create calls (state updates are async). */
  const busyRef = useRef(false)
  /** EN: Invalidates a late `listBookmarkFolders` result after the panel was closed/reopened. */
  const loadTokenRef = useRef(0)

  const updatePanel = useCallback(
    (updater: (panel: BookmarkPanel) => BookmarkPanel) => {
      dispatch({
        type: "update",
        updater: (prev) =>
          prev.bookmarkPanel === null
            ? prev
            : { ...prev, bookmarkPanel: updater(prev.bookmarkPanel) }
      })
    },
    [dispatch]
  )

  const appendLog = useCallback(
    (lines: string[]) => {
      if (lines.length === 0) {
        return
      }
      void onAppendLog?.(lines)
    },
    [onAppendLog]
  )

  const closeBookmarkPanel = useCallback(() => {
    loadTokenRef.current += 1
    dispatch({
      type: "update",
      updater: (prev) => (prev.bookmarkPanel === null ? prev : { ...prev, bookmarkPanel: null })
    })
  }, [dispatch])

  // ---------------------------------------------------------------------------
  // Open
  // ---------------------------------------------------------------------------

  const openBookmarkPanelForTargets = useCallback(
    (targets: readonly ActionMenuTabTarget[]) => {
      if (targets.length === 0) {
        appendLog([tTabs("tabs.picker.bookmark.noTargets", locale)])
        return
      }

      const remoteTabIds = new Set<number>()
      for (const row of rows) {
        if (row.kind === "tab" && row.remote) {
          remoteTabIds.add(row.tabId)
        }
      }
      if (targets.some((t) => remoteTabIds.has(t.tabId))) {
        appendLog([tTabs("tabs.picker.bookmark.localOnly", locale)])
        return
      }

      const liveTargets: ActionMenuTabTarget[] = targets.map((t) => ({
        ...t,
        title: resolveLiveTabTitle(t.tabId, t.title),
        url: resolveLiveTabUrl(t.tabId, t.url)
      }))

      const mode: BookmarkPanelMode = liveTargets.length === 1 ? "single" : "multi"
      const drafts = buildBookmarkDrafts(liveTargets, mode)
      if (drafts.items.length === 0) {
        appendLog([tTabs("tabs.picker.bookmark.noValidUrls", locale)])
        return
      }

      loadTokenRef.current += 1
      const token = loadTokenRef.current

      const panel: BookmarkPanel = {
        mode,
        phase: mode === "single" ? "itemEdit" : "folderPick",
        items: drafts.items,
        skippedInvalidCount: drafts.skippedInvalidCount,
        folders: [],
        foldersLoaded: false,
        folderPickIndex: 0,
        newFolderName: "",
        duplicateUrls: [],
        errorMessage: null,
        submitting: false
      }
      dispatch({
        type: "update",
        updater: (prev) => ({ ...prev, actionMenuPanel: null, bookmarkPanel: panel })
      })

      void (async () => {
        try {
          const choices = await listBookmarkFolders()
          if (token !== loadTokenRef.current) {
            return
          }
          const options = buildBookmarkFolderOptions(choices, (id) =>
            tTabs("tabs.picker.bookmark.unnamedFolder", locale, { id })
          )
          const defaultIndex = defaultBookmarkFolderIndex(options)
          updatePanel((current) => ({
            ...current,
            folders: options,
            foldersLoaded: true,
            // EN: Multi mode row 0 is "new folder"; existing folders start at row 1.
            folderPickIndex:
              current.mode === "multi"
                ? options.length > 0
                  ? defaultIndex + 1
                  : 0
                : defaultIndex
          }))
        } catch (err) {
          if (token !== loadTokenRef.current) {
            return
          }
          updatePanel((current) => ({
            ...current,
            foldersLoaded: true,
            errorMessage: tTabs("tabs.picker.bookmark.error.folderLoad", locale, {
              message: errorText(err)
            })
          }))
        }
      })()
    },
    [appendLog, dispatch, locale, rows, updatePanel]
  )

  const openBookmarkFromPicker = useCallback(() => {
    const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
    const targetKind = resolveActionMenuTargetKind(markedKind, row)
    if (targetKind === null) {
      return
    }
    const tabTargets = resolveActionMenuTabTargets(
      rows,
      markedKind,
      markedTabIds,
      markedWindowIds,
      markedGroupKeys,
      row
    )
    // EN: Same resolver as the action menu, so window/group rows expand to member tabs.
    openBookmarkPanelForTargets(tabTargets)
  }, [
    hi,
    markedGroupKeys,
    markedKind,
    markedTabIds,
    markedWindowIds,
    openBookmarkPanelForTargets,
    rows,
    visibleRowIndices
  ])

  // ---------------------------------------------------------------------------
  // Field edits
  // ---------------------------------------------------------------------------

  const onBookmarkItemTitleChange = useCallback(
    (index: number, value: string) => {
      updatePanel((current) => ({
        ...current,
        errorMessage: null,
        items: current.items.map((item, i): BookmarkItemDraft =>
          i === index ? { ...item, title: value } : item
        )
      }))
    },
    [updatePanel]
  )

  const onBookmarkItemUrlChange = useCallback(
    (index: number, value: string) => {
      updatePanel((current) => ({
        ...current,
        errorMessage: null,
        items: current.items.map((item, i): BookmarkItemDraft =>
          i === index ? { ...item, url: value } : item
        )
      }))
    },
    [updatePanel]
  )

  const onBookmarkNewFolderNameChange = useCallback(
    (value: string) => {
      updatePanel((current) => ({ ...current, errorMessage: null, newFolderName: value }))
    },
    [updatePanel]
  )

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const showError = useCallback(
    (message: string) => {
      updatePanel((current) => ({ ...current, errorMessage: message, submitting: false }))
    },
    [updatePanel]
  )

  /** EN: Caller must hold `busyRef`. Creates folder (if new) then bookmarks; closes the panel on completion. */
  const createBookmarksLocked = useCallback(
    async (panel: BookmarkPanel, skipDuplicates: boolean): Promise<void> => {
      const validation = validateBookmarkItems(panel.items)
      if (validation.ok === false) {
        showError(validationFailureText(validation.failure, locale))
        return
      }

      const duplicateSet = new Set(panel.duplicateUrls)
      const toCreate = skipDuplicates
        ? validation.items.filter((item) => !duplicateSet.has(item.url))
        : validation.items
      const skippedDupCount = validation.items.length - toCreate.length

      updatePanel((current) => ({ ...current, errorMessage: null, submitting: true }))

      const finishLines: string[] = []

      if (toCreate.length === 0) {
        finishLines.push(
          tTabs("tabs.picker.bookmark.skippedDup", locale, { count: String(skippedDupCount) })
        )
        closeBookmarkPanel()
        clearMarkedViaReducer()
        appendLog(finishLines)
        return
      }

      let parentId: string
      let folderLabel: string
      if (isNewBookmarkFolderSelected(panel)) {
        const folderName = validateNewBookmarkFolderName(panel.newFolderName)
        if (folderName === null) {
          showError(tTabs("tabs.picker.bookmark.error.folderName", locale))
          return
        }
        try {
          // EN: No parentId → Chrome places the folder under its default parent.
          const createdFolder = await chrome.bookmarks.create({ title: folderName })
          parentId = createdFolder.id
          folderLabel = folderName
        } catch (err) {
          showError(
            tTabs("tabs.picker.bookmark.error.createFolder", locale, { message: errorText(err) })
          )
          return
        }
      } else {
        const folder = selectedBookmarkFolder(panel)
        if (folder === null) {
          showError(tTabs("tabs.picker.bookmark.error.noFolder", locale))
          return
        }
        const safeId = sanitizeBookmarkParentId(folder.id)
        if (safeId === null) {
          showError(tTabs("tabs.picker.bookmark.error.noFolder", locale))
          return
        }
        parentId = safeId
        folderLabel = folder.label
      }

      let createdCount = 0
      let firstFailure: string | null = null
      for (const item of toCreate) {
        try {
          await chrome.bookmarks.create({ parentId, title: item.title, url: item.url })
          createdCount += 1
        } catch (err) {
          if (firstFailure === null) {
            firstFailure = errorText(err)
          }
        }
      }

      if (createdCount > 0) {
        finishLines.push(
          tTabs("tabs.picker.bookmark.done", locale, {
            count: String(createdCount),
            folder: folderLabel
          })
        )
      }
      if (skippedDupCount > 0) {
        finishLines.push(
          tTabs("tabs.picker.bookmark.skippedDup", locale, { count: String(skippedDupCount) })
        )
      }
      if (panel.skippedInvalidCount > 0) {
        finishLines.push(
          tTabs("tabs.picker.bookmark.skippedInvalid", locale, {
            count: String(panel.skippedInvalidCount)
          })
        )
      }
      if (firstFailure !== null) {
        finishLines.push(tTabs("tabs.picker.bookmark.failed", locale, { message: firstFailure }))
      }

      closeBookmarkPanel()
      clearMarkedViaReducer()
      appendLog(finishLines)
    },
    [appendLog, clearMarkedViaReducer, closeBookmarkPanel, locale, showError, updatePanel]
  )

  /** EN: itemEdit → validate → duplicate check → (dupConfirm | create). */
  const confirmItems = useCallback(
    async (panel: BookmarkPanel): Promise<void> => {
      if (busyRef.current) {
        return
      }
      const validation = validateBookmarkItems(panel.items)
      if (validation.ok === false) {
        showError(validationFailureText(validation.failure, locale))
        return
      }
      if (!isNewBookmarkFolderSelected(panel) && selectedBookmarkFolder(panel) === null) {
        showError(tTabs("tabs.picker.bookmark.error.noFolder", locale))
        return
      }

      busyRef.current = true
      updatePanel((current) => ({ ...current, errorMessage: null, submitting: true }))
      try {
        const duplicateUrls: string[] = []
        for (const item of validation.items) {
          const matches = await findBookmarksByUrl(item.url)
          if (matches.length > 0 && !duplicateUrls.includes(item.url)) {
            duplicateUrls.push(item.url)
          }
        }
        if (duplicateUrls.length > 0) {
          updatePanel((current) => ({
            ...current,
            phase: "dupConfirm",
            duplicateUrls,
            errorMessage: null,
            submitting: false
          }))
          return
        }
        await createBookmarksLocked(panel, false)
      } catch (err) {
        showError(tTabs("tabs.picker.bookmark.error.generic", locale, { message: errorText(err) }))
      } finally {
        busyRef.current = false
      }
    },
    [createBookmarksLocked, locale, showError, updatePanel]
  )

  /** EN: dupConfirm → create all (`y` / Enter) or skip duplicates (`n`). */
  const resolveDuplicates = useCallback(
    async (panel: BookmarkPanel, skipDuplicates: boolean): Promise<void> => {
      if (busyRef.current) {
        return
      }
      busyRef.current = true
      try {
        await createBookmarksLocked(panel, skipDuplicates)
      } catch (err) {
        showError(tTabs("tabs.picker.bookmark.error.generic", locale, { message: errorText(err) }))
      } finally {
        busyRef.current = false
      }
    },
    [createBookmarksLocked, locale, showError]
  )

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  const focusFieldByDelta = useCallback(
    (delta: number) => {
      const root = bookmarkPanelRef.current
      if (root === null) {
        return
      }
      const fields = Array.from(root.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
      if (fields.length === 0) {
        return
      }
      const activeIndex = fields.findIndex((el) => el === document.activeElement)
      const nextIndex =
        activeIndex < 0
          ? delta >= 0
            ? 0
            : fields.length - 1
          : wrapIndex(activeIndex, delta, fields.length)
      fields[nextIndex]?.focus({ preventScroll: true })
    },
    [bookmarkPanelRef]
  )

  const moveFolderPick = useCallback(
    (panel: BookmarkPanel, delta: number) => {
      const count = bookmarkFolderRowCount(panel)
      if (count === 0) {
        return
      }
      updatePanel((current) => ({
        ...current,
        errorMessage: null,
        folderPickIndex: wrapIndex(current.folderPickIndex, delta, bookmarkFolderRowCount(current))
      }))
    },
    [updatePanel]
  )

  const goBack = useCallback(
    (panel: BookmarkPanel) => {
      if (panel.phase === "dupConfirm") {
        updatePanel((current) => ({ ...current, phase: "itemEdit", errorMessage: null }))
        return
      }
      if (panel.phase === "itemEdit") {
        if (panel.mode === "single") {
          closeBookmarkPanel()
          return
        }
        updatePanel((current) => ({
          ...current,
          phase: isNewBookmarkFolderSelected(current) ? "newFolder" : "folderPick",
          errorMessage: null
        }))
        return
      }
      if (panel.phase === "newFolder") {
        updatePanel((current) => ({ ...current, phase: "folderPick", errorMessage: null }))
        return
      }
      closeBookmarkPanel()
    },
    [closeBookmarkPanel, updatePanel]
  )

  const advance = useCallback(
    (panel: BookmarkPanel) => {
      if (panel.phase === "folderPick") {
        if (!panel.foldersLoaded) {
          return
        }
        if (isNewBookmarkFolderSelected(panel)) {
          updatePanel((current) => ({ ...current, phase: "newFolder", errorMessage: null }))
          return
        }
        if (selectedBookmarkFolder(panel) === null) {
          showError(tTabs("tabs.picker.bookmark.error.noFolder", locale))
          return
        }
        updatePanel((current) => ({ ...current, phase: "itemEdit", errorMessage: null }))
        return
      }
      if (panel.phase === "newFolder") {
        const folderName = validateNewBookmarkFolderName(panel.newFolderName)
        if (folderName === null) {
          showError(tTabs("tabs.picker.bookmark.error.folderName", locale))
          return
        }
        updatePanel((current) => ({
          ...current,
          phase: "itemEdit",
          newFolderName: folderName,
          errorMessage: null
        }))
        return
      }
      if (panel.phase === "itemEdit") {
        void confirmItems(panel)
        return
      }
      void resolveDuplicates(panel, false)
    },
    [confirmItems, locale, resolveDuplicates, showError, updatePanel]
  )

  const handleBookmarkKeydown = useCallback(
    (e: KeyboardEvent): boolean => {
      const panel = bookmarkPanel
      if (panel === null) {
        return false
      }
      // EN: IME composition and Ctrl/Alt/Meta chords belong to the focused input / browser.
      if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey) {
        return true
      }

      if (panel.submitting) {
        if (
          e.key === "Escape" ||
          e.key === "Enter" ||
          e.key === "Tab" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown"
        ) {
          pickerStopEvent(e)
        }
        return true
      }

      if (e.key === "Escape") {
        pickerStopEvent(e)
        goBack(panel)
        return true
      }

      if (e.key === "Enter") {
        pickerStopEvent(e)
        advance(panel)
        return true
      }

      if (e.key === "Tab") {
        pickerStopEvent(e)
        if (panel.phase === "itemEdit") {
          focusFieldByDelta(e.shiftKey ? -1 : 1)
        }
        return true
      }

      if (panel.phase === "dupConfirm" && !e.shiftKey) {
        if (e.key === "y" || e.key === "Y") {
          pickerStopEvent(e)
          void resolveDuplicates(panel, false)
          return true
        }
        if (e.key === "n" || e.key === "N") {
          pickerStopEvent(e)
          void resolveDuplicates(panel, true)
          return true
        }
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const delta = e.key === "ArrowDown" ? 1 : -1
        if (panel.phase === "folderPick") {
          pickerStopEvent(e)
          moveFolderPick(panel, delta)
          return true
        }
        if (panel.phase === "itemEdit") {
          const target = e.target
          const fieldEl =
            target instanceof HTMLElement ? target.closest<HTMLElement>(FIELD_SELECTOR) : null
          const field = fieldEl?.dataset.bmxtBookmarkField ?? null
          if (panel.mode === "single") {
            if (field === "folder") {
              pickerStopEvent(e)
              moveFolderPick(panel, delta)
            }
            // EN: On title/URL inputs ↑↓ keep their default caret behaviour.
            return true
          }
          pickerStopEvent(e)
          focusFieldByDelta(delta)
          return true
        }
      }

      // EN: Everything else (typing, caret keys) goes to the focused field; the picker chain stays blocked.
      return true
    },
    [advance, bookmarkPanel, focusFieldByDelta, goBack, moveFolderPick, resolveDuplicates]
  )

  // ---------------------------------------------------------------------------
  // Focus / scroll
  // ---------------------------------------------------------------------------

  const phase = bookmarkPanel?.phase ?? null
  useLayoutEffect(() => {
    if (phase === null) {
      return
    }
    const root = bookmarkPanelRef.current
    if (phase === "itemEdit" || phase === "newFolder") {
      const first = root?.querySelector<HTMLElement>(FIELD_SELECTOR)
      if (first) {
        first.focus({ preventScroll: true })
        return
      }
    }
    inputRef.current?.focus({ preventScroll: true })
  }, [bookmarkPanelRef, inputRef, phase])

  const folderPickIndex = bookmarkPanel?.folderPickIndex ?? 0
  const foldersLoaded = bookmarkPanel?.foldersLoaded ?? false
  useLayoutEffect(() => {
    if (phase === null || !foldersLoaded) {
      return
    }
    const row = bookmarkPanelRef.current?.querySelector<HTMLElement>(
      `[data-bmxt-bookmark-folder-pick="${folderPickIndex}"]`
    )
    row?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bookmarkPanelRef, folderPickIndex, foldersLoaded, phase])

  return {
    openBookmarkPanelForTargets,
    openBookmarkFromPicker,
    closeBookmarkPanel,
    handleBookmarkKeydown,
    onBookmarkItemTitleChange,
    onBookmarkItemUrlChange,
    onBookmarkNewFolderNameChange
  }
}
