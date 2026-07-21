import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { tPrompt } from "../../setting/i18n/ns/prompt"
import { tSession } from "../../setting/i18n/ns/session"
import type { UiLocale } from "../../setting/locale"
import { CSP_DYNAMIC_SCOPE_ATTR } from "../csp-dynamic-stylesheet"
import { TokenPickerPanel, type TokenPickerModel } from "../token-picker-panel"
import { SessionListCandidatePanel, type SessionCandidatePanelVariant, type SessionListRow } from "../../session"
import { renderPromptMirrorChipsOnly, renderPromptMirrorLine } from "./prompt-mirror-chips"
import type { NavReloadTabChipMeta } from "../../nav/nav-reload-tab-token"

type PromptMirrorSegments = {
  before: string
  cur: string
  after: string
  composition: string
}

type PromptInputProps = {
  mode: "normal" | "isearch"
  line: string
  cursorPos: number
  isComposing: boolean
  promptPaneFocused: boolean
  navPageTyping: boolean
  navTypingMultiline: boolean
  sessionNameTyping: boolean
  showSearchListPatternPlaceholder: boolean
  mirror: PromptMirrorSegments
  uiLocale: UiLocale
  imeRef: React.RefObject<HTMLTextAreaElement>
  cursorMirrorCellRef: React.RefObject<HTMLSpanElement>
  subCmdPickerHostRef: React.RefObject<HTMLDivElement>
  promptPickerOpen: boolean
  promptPickerScopeId: string | null
  subCmdPickerScopeId: string
  subCmdPicker: TokenPickerModel | null
  sessionListPickerHi: number | null
  sessionListPickerRows: SessionListRow[]
  sessionPickerVariant: SessionCandidatePanelVariant | null
  navReloadTabMeta: ReadonlyMap<number, NavReloadTabChipMeta>
  onImeInput: React.FormEventHandler<HTMLTextAreaElement>
  onBeforeInput: React.FormEventHandler<HTMLTextAreaElement>
  onImeSelect: React.ReactEventHandler<HTMLTextAreaElement>
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>
  onPaste: React.ClipboardEventHandler<HTMLTextAreaElement>
  onCompositionStart: React.CompositionEventHandler<HTMLTextAreaElement>
  onCompositionUpdate: React.CompositionEventHandler<HTMLTextAreaElement>
  onCompositionEnd: React.CompositionEventHandler<HTMLTextAreaElement>
}

export function PromptInput({
  mode,
  line,
  cursorPos,
  isComposing,
  promptPaneFocused,
  navPageTyping,
  navTypingMultiline,
  sessionNameTyping,
  showSearchListPatternPlaceholder,
  mirror,
  uiLocale,
  imeRef,
  cursorMirrorCellRef,
  subCmdPickerHostRef,
  promptPickerOpen,
  promptPickerScopeId,
  subCmdPickerScopeId,
  subCmdPicker,
  sessionListPickerHi,
  sessionListPickerRows,
  sessionPickerVariant,
  navReloadTabMeta,
  onImeInput,
  onBeforeInput,
  onImeSelect,
  onKeyDown,
  onPaste,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd
}: PromptInputProps) {
  const navPromptValueControlled = !navPageTyping
  const showNavTypingPlaceholder = navPageTyping && line.trim() === "" && !isComposing
  const showSessionNameTypingPlaceholder = sessionNameTyping && !isComposing
  const [imeDomFocused, setImeDomFocused] = useState(false)

  useEffect(() => {
    if (!promptPaneFocused) {
      setImeDomFocused(false)
      return
    }
    const ta = imeRef.current
    if (!ta) {
      return
    }
    setImeDomFocused(document.activeElement === ta)
    const onFocus = () => setImeDomFocused(true)
    const onBlur = () => setImeDomFocused(false)
    ta.addEventListener("focus", onFocus)
    ta.addEventListener("blur", onBlur)
    return () => {
      ta.removeEventListener("focus", onFocus)
      ta.removeEventListener("blur", onBlur)
    }
  }, [promptPaneFocused, imeRef])

  const caretActive = promptPaneFocused && imeDomFocused
  const promptFieldRef = useRef<HTMLDivElement>(null)
  const promptMirrorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const field = promptFieldRef.current
    const mirror = promptMirrorRef.current
    const ta = imeRef.current
    if (!field || !mirror || !ta) {
      return
    }
    const next = Math.max(mirror.scrollHeight, Math.ceil(1.35 * 16))
    field.style.minHeight = `${next}px`
    ta.style.minHeight = `${next}px`
  }, [line, cursorPos, navReloadTabMeta, mirror.composition, imeRef])

  return (
    <div
      className={`bmxt-prompt-line${navPageTyping ? " bmxt-prompt-line--nav-typing" : ""}${sessionNameTyping ? " bmxt-prompt-line--session-name-typing" : ""}`}>
      <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
      <div ref={promptFieldRef} className="bmxt-prompt-field">
        <div ref={promptMirrorRef} className="bmxt-prompt-mirror" aria-hidden>
          {mirror.composition ? (
            <>
              <span>{renderPromptMirrorChipsOnly(mirror.before, navReloadTabMeta)}</span>
              <span className="bmxt-prompt-composition">{mirror.composition}</span>
              <span>{renderPromptMirrorChipsOnly(mirror.after, navReloadTabMeta)}</span>
            </>
          ) : (
            renderPromptMirrorLine(line, cursorPos, navReloadTabMeta, {
              caretActive,
              cursorMirrorCellRef,
              composition: ""
            })
          )}
        </div>
        <textarea
          ref={imeRef}
          className="bmxt-prompt-ime"
          rows={1}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          tabIndex={promptPaneFocused ? 0 : -1}
          aria-label={
            mode === "isearch"
              ? tPrompt("prompt.isearch.aria", uiLocale)
              : tPrompt("prompt.commandLine.aria", uiLocale)
          }
          placeholder={
            showNavTypingPlaceholder
              ? navTypingMultiline
                ? tPrompt("prompt.navTypingMultiline", uiLocale)
                : tPrompt("prompt.navTyping", uiLocale)
              : showSessionNameTypingPlaceholder
                ? tSession("session.settingName.placeholder", uiLocale)
              : showSearchListPatternPlaceholder
                ? tPrompt("prompt.searchListPattern", uiLocale)
                : mode === "normal" && line.trim() === ""
                  ? tPrompt("prompt.placeholder", uiLocale)
                  : undefined
          }
          value={navPromptValueControlled ? line : undefined}
          readOnly={!promptPaneFocused}
          onInput={onImeInput}
          onBeforeInput={onBeforeInput}
          onSelect={onImeSelect}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onCompositionStart={onCompositionStart}
          onCompositionUpdate={onCompositionUpdate}
          onCompositionEnd={onCompositionEnd}
        />
        {promptPickerOpen ? (
          <div
            ref={subCmdPickerHostRef}
            className="bmxt-subcmd-picker-host bmxt-subcmd-picker-host--positioned"
            {...{ [CSP_DYNAMIC_SCOPE_ATTR]: promptPickerScopeId ?? subCmdPickerScopeId }}>
            {subCmdPicker ? (
              <TokenPickerPanel model={subCmdPicker} />
            ) : sessionListPickerHi !== null ? (
              <SessionListCandidatePanel
                rows={sessionListPickerRows}
                hi={sessionListPickerHi}
                variant={sessionPickerVariant ?? "list"}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
