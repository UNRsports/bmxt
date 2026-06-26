import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../bmxt-window/csp-dynamic-stylesheet"
import { tPlainPicker } from "./i18n/ns/plain-picker"
import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import {
  computePlainPickerWindow,
  PLAIN_PICKER_ROW_HEIGHT_FALLBACK,
  PLAIN_PICKER_VIRTUALIZE_MIN,
  scrollTopForPlainPickerIndex
} from "../side-picker/plain/plain-text-picker-virtual"
import type { UiSettingsStorageConfig } from "./settings-storage-config"
import type { SnapshotStorageConfig } from "../snapshot/snapshot-storage-config"
import type { SettingListPickerState } from "./setting-list-picker-state"
import type { SettingPickerRow } from "./setting-picker-rows"
import { settingPickerEditAriaLabel, settingPickerInitialHi } from "./setting-picker-rows"
import { isSettingDetailView } from "./setting-picker-nav"
import {
  useSettingPickerKeyboard,
  type SettingPickerKeyboardCallbacks
} from "./use-setting-picker-keyboard"

const ROW_ID_PREFIX = "bmxt-setting-row"

function SettingPickerRowView({
  index,
  line,
  hi,
  statusOnly = false
}: {
  index: number
  line: string
  hi: number
  statusOnly?: boolean
}): ReactNode {
  const hiRow = !statusOnly && index === hi
  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role={statusOnly ? "listitem" : "option"}
      aria-selected={hiRow}
      className={`bmxt-tab-picker-row bmxt-tab-picker-row--tab bmxt-setting-picker-row${
        hiRow ? " bmxt-tab-picker-row--hi" : ""
      }${statusOnly ? " bmxt-tab-picker-row--status" : ""}`}>
      <span className="bmxt-plain-picker-row-text">{line || "\u00a0"}</span>
    </div>
  )
}

export type SettingPickerBodyProps = {
  headline: string
  lines: readonly string[]
  rows: readonly SettingPickerRow[]
  state: SettingListPickerState
  locale: UiLocale
  onStateChange: (next: SettingListPickerState) => void
  keyboardCallbacks: SettingPickerKeyboardCallbacks
  onReturnToPrompt: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  statusLines?: readonly string[]
  preview?: ReactNode
  storageConfig?: UiSettingsStorageConfig
  snapshotStorageConfig?: SnapshotStorageConfig
}

export function SettingPickerBody({
  headline,
  lines,
  rows,
  state,
  locale,
  onStateChange,
  keyboardCallbacks,
  onReturnToPrompt,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  statusLines = [],
  preview = null,
  storageConfig,
  snapshotStorageConfig
}: SettingPickerBodyProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )
  const listRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [hi, setHiState] = useState(0)
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

  const setHi = useCallback((action: number | ((prev: number) => number)) => {
    setHiState((prev) => (typeof action === "function" ? action(prev) : action))
  }, [])

  const listInitialHi = useMemo(
    () =>
      settingPickerInitialHi(
        state.view,
        state.draft.locale,
        state.draft.appearance,
        storageConfig,
        snapshotStorageConfig
      ),
    [state.view, state.draft.locale, state.draft.appearance, storageConfig, snapshotStorageConfig]
  )

  useEffect(() => {
    setHiState(listInitialHi)
  }, [listInitialHi, state.view, state.editing])

  const editing = state.editing
  const displayLines = useMemo(() => {
    if (editing && isSettingDetailView(state.view)) {
      const draft = state.editDraft.length > 0 ? state.editDraft : " "
      return [draft]
    }
    return lines
  }, [editing, lines, state.editDraft, state.view])

  useEffect(() => {
    if (displayLines.length === 0) {
      return
    }
    setHiState((h) => Math.min(Math.max(0, h), displayLines.length - 1))
  }, [displayLines.length])

  const useVirtual = displayLines.length >= PLAIN_PICKER_VIRTUALIZE_MIN
  const effectiveRowHeight = rowHeight ?? PLAIN_PICKER_ROW_HEIGHT_FALLBACK

  const syncWindowFromScroll = useCallback(() => {
    const list = listRef.current
    if (!list || !useVirtual || displayLines.length === 0) {
      return
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        displayLines.length,
        effectiveRowHeight
      )
    )
  }, [displayLines.length, effectiveRowHeight, useVirtual])

  useLayoutEffect(() => {
    const probe = measureRef.current
    if (!probe) {
      return
    }
    const h = probe.getBoundingClientRect().height
    if (h > 0) {
      setRowHeight(h)
    }
  }, [displayLines.length])

  useLayoutEffect(() => {
    if (!useVirtual) {
      if (displayLines.length === 0) {
        return
      }
      document.getElementById(`${ROW_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
      return
    }
    const list = listRef.current
    if (!list) {
      return
    }
    const nextTop = scrollTopForPlainPickerIndex(
      list.scrollTop,
      list.clientHeight,
      hi,
      effectiveRowHeight
    )
    if (nextTop !== list.scrollTop) {
      list.scrollTop = nextTop
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        displayLines.length,
        effectiveRowHeight
      )
    )
  }, [displayLines.length, effectiveRowHeight, hi, useVirtual])

  const { onInputKeyDown } = useSettingPickerKeyboard({
    state,
    onStateChange,
    rows,
    hi,
    setHi,
    keyboardActive,
    sessionId,
    callbacks: {
      ...keyboardCallbacks,
      onReturnToPrompt
    },
    storageConfig,
    snapshotStorageConfig
  })

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    } else {
      inputRef.current?.blur()
    }
  }, [keyboardActive])

  useLayoutEffect(() => {
    if (!keyboardActive || !state.editing) {
      return
    }
    const el = inputRef.current
    if (!el) {
      return
    }
    el.focus()
    const end = el.value.length
    el.setSelectionRange(end, end)
  }, [keyboardActive, state.editing, state.view])

  const activeRowId =
    !editing &&
    displayLines.length > 0 &&
    hi >= 0 &&
    hi < displayLines.length
      ? `${ROW_ID_PREFIX}-${hi}`
      : undefined

  const renderRows = (start: number, end: number) => {
    const slice: ReactNode[] = []
    for (let i = start; i < end; i++) {
      slice.push(
        <SettingPickerRowView key={i} index={i} line={displayLines[i]!} hi={hi} />
      )
    }
    return slice
  }

  const totalHeight = useVirtual ? displayLines.length * effectiveRowHeight : undefined
  const virtualStart = useVirtual ? windowRange.start : 0
  const virtualEnd = useVirtual ? windowRange.end : displayLines.length
  const virtualTrackScopeId = useId()
  const virtualWindowScopeId = useId()
  useCspDynamicStyle(
    useVirtual ? virtualTrackScopeId : null,
    useVirtual && totalHeight !== undefined ? { height: `${totalHeight}px` } : null
  )
  useCspDynamicStyle(
    useVirtual ? virtualWindowScopeId : null,
    useVirtual
      ? { transform: `translateY(${virtualStart * effectiveRowHeight}px)` }
      : null
  )

  const textareaValue = editing ? state.editDraft : ""
  const textareaAria = editing
    ? settingPickerEditAriaLabel(state.view, locale)
    : tSetting("setting.picker.keysHint", locale)
  const textareaClassName = editing
    ? "bmxt-tab-picker-filter-ime bmxt-setting-picker-edit-input"
    : "bmxt-tab-picker-filter-ime bmxt-picker-hidden-ime"

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-setting-picker">
      <div className="bmxt-tab-picker-head">{headline}</div>
      <textarea
        ref={setInputEl}
        className={textareaClassName}
        rows={editing ? 2 : 1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={textareaAria}
        value={textareaValue}
        readOnly={!editing}
        onChange={(e) => {
          if (!editing) {
            return
          }
          onStateChange({ ...state, editDraft: e.target.value })
        }}
        onKeyDown={onInputKeyDown}
      />
      <div
        ref={listRef}
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label={tSetting("setting.picker.listAria", locale)}
        aria-activedescendant={editing ? undefined : activeRowId}
        onScroll={useVirtual ? syncWindowFromScroll : undefined}>
        {displayLines.length >= PLAIN_PICKER_VIRTUALIZE_MIN ? (
          <div
            ref={measureRef}
            className="bmxt-tab-picker-row bmxt-tab-picker-row--tab bmxt-setting-picker-row bmxt-plain-picker-measure-row"
            aria-hidden>
            <span className="bmxt-plain-picker-row-text">{"\u00a0"}</span>
          </div>
        ) : null}
        {displayLines.length === 0 ? (
          <div className="bmxt-tab-picker-empty">{tPlainPicker("plainPicker.noOutput", locale)}</div>
        ) : useVirtual ? (
          <div
            className="bmxt-plain-picker-virtual-track"
            {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualTrackScopeId }}>
            <div
              className="bmxt-plain-picker-virtual-window"
              {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualWindowScopeId }}>
              {renderRows(virtualStart, virtualEnd)}
            </div>
          </div>
        ) : (
          renderRows(0, displayLines.length)
        )}
        {statusLines.map((line, i) => (
          <SettingPickerRowView
            key={`status-${i}`}
            index={lines.length + i}
            line={line}
            hi={-1}
            statusOnly
          />
        ))}
        {editing ? (
          <div
            className="bmxt-tab-picker-row bmxt-tab-picker-row--tab bmxt-setting-picker-row bmxt-tab-picker-row--status"
            role="listitem">
            <span className="bmxt-plain-picker-row-text">
              {tSetting("setting.picker.editingHint", locale)}
            </span>
          </div>
        ) : null}
      </div>
      {preview}
    </div>
  )
}
