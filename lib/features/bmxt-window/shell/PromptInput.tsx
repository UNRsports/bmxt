import React from "react"
import type { UiCopy } from "../../setting/i18n/messages"
import { CSP_DYNAMIC_SCOPE_ATTR } from "../csp-dynamic-stylesheet"
import { TokenPickerPanel, type TokenPickerModel } from "../token-picker-panel"
import { SessionListCandidatePanel, type SessionCandidatePanelVariant, type SessionListRow } from "../../session"

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
  uiCopy: UiCopy
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
  uiCopy,
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

  return (
    <div
      className={`bmxt-prompt-line${navPageTyping ? " bmxt-prompt-line--nav-typing" : ""}${sessionNameTyping ? " bmxt-prompt-line--session-name-typing" : ""}`}>
      <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
      <div className="bmxt-prompt-field">
        <div className="bmxt-prompt-mirror" aria-hidden>
          <span>{mirror.before}</span>
          {mirror.composition ? (
            <span className="bmxt-prompt-composition">{mirror.composition}</span>
          ) : (
            <span
              ref={cursorMirrorCellRef}
              className={`bmxt-cursor-cell${mirror.cur ? "" : " bmxt-cursor-cell--eol"}${promptPaneFocused ? "" : " bmxt-cursor-cell--inactive"}`}>
              {mirror.cur || "\u00a0"}
            </span>
          )}
          <span>{mirror.after}</span>
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
              ? uiCopy.t("prompt.isearch.aria")
              : uiCopy.t("prompt.commandLine.aria")
          }
          placeholder={
            showNavTypingPlaceholder
              ? navTypingMultiline
                ? uiCopy.t("prompt.navTypingMultiline")
                : uiCopy.t("prompt.navTyping")
              : showSessionNameTypingPlaceholder
                ? uiCopy.t("session.settingName.placeholder")
              : showSearchListPatternPlaceholder
                ? uiCopy.t("prompt.searchListPattern")
                : mode === "normal" && line.trim() === ""
                  ? uiCopy.t("prompt.placeholder")
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
