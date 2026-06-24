#!/usr/bin/env python3
"""Wire extracted shell hooks into bmxt-shell.tsx via line-range surgery."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHELL = ROOT / "lib/features/bmxt-window/bmxt-shell.tsx"

HOOK_IMPORTS = """import { usePromptPickers } from "./shell/usePromptPickers"
import { useNavPromptBridge } from "./shell/useNavPromptBridge"
import { usePaneFocusController } from "./shell/usePaneFocusController"
import { useShellKeyboard } from "./shell/useShellKeyboard"
"""

USE_PROMPT_PICKERS = """
  const {
    subCmdPicker,
    setSubCmdPicker,
    subCmdPickerRef,
    sessionListPickerHi,
    setSessionListPickerHi,
    sessionListPickerHiRef,
    sessionListPickerOpen,
    sessionListPickerRows,
    sessionListPickerRowsRef,
    sessionListRowsRef,
    sessionPickerVariant,
    setSessionPickerVariant,
    sessionPickerVariantRef,
    sessionListPickerDismissedRef,
    allowEmptyFirstPickerSyncRef,
    tabPickerOpenRequestRef,
    imeTokenPickerDismissedRef,
    dismissImeTokenPicker,
    closePromptPickerUi,
    syncImeTokenPicker,
    promptPickerOpen,
    promptPickerScopeId,
    subCmdPickerScopeId,
    sessionListPickerScopeId
  } = usePromptPickers({
    sessionId,
    mode,
    line,
    cursorPos,
    isComposing,
    localCompletion,
    sessionListRows,
    navPageTyping,
    paneFocusRef,
    sessionNameTypingRef,
    scrollRef,
    cursorMirrorCellRef,
    subCmdPickerHostRef
  })
"""

USE_PANE_FOCUS = """
  const {
    promptPaneFocused,
    pickerPulseSlot,
    pickerColumnOrder,
    activatePaneFocus,
    activateDetailBar,
    enterPickerFromDetailBar,
    exitPickerToDetailBar,
    exitDetailBarToTerminal,
    closeSettingPickerColumn,
    focusPickerSlot,
    handleToggleNavActive
  } = usePaneFocusController({
    sessionId,
    isFocusedPane,
    paneFocus,
    onPaneFocusChange,
    detailBarId,
    setDetailBarId,
    modeToolbarOrder,
    setModeToolbarOrder,
    sessionPickers,
    navArmed,
    navActive,
    navArmedRef,
    navActiveRef,
    navPageTyping,
    navTypingMode,
    navMenuOpen,
    navTextSelPicking,
    navTextSelDone,
    sessionNameTyping,
    mode,
    subCmdPicker,
    sessionListPickerOpen,
    tabPicker,
    searchListPicker,
    domListPicker,
    settingListPicker,
    translateEnabled,
    translatePairIdRef,
    tabsPageActiveModeRef,
    searchPageActiveModeRef,
    setTabsPageActiveMode,
    setSearchPageActiveMode,
    setTranslatePairId,
    toggleNavActive,
    resetNavTranslateSession,
    lineRef,
    cursorRef,
    setCursorPos,
    imeRef,
    tabPickerInputRef,
    searchPickerInputRef,
    domPickerInputRef,
    settingPickerInputRef,
    pickersForColumnOrder,
    openPickers,
    focusPrompt,
    closePromptPickerUi,
    setSettingListPicker
  })
"""

USE_NAV_BRIDGE = """
  const {
    onImeInput,
    onImeSelect,
    onBeforeInput,
    onPaste,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd
  } = useNavPromptBridge({
    navPageTyping,
    navTypingMultiline,
    mode,
    promptPaneFocused,
    isComposing,
    lineRef,
    cursorRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    navPromptSnapRef,
    skipHistResetRef,
    tabPressSeqRef,
    allowEmptyFirstPickerSyncRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    setSubCmdPicker,
    setHistNavIndex,
    setISearchCycle,
    setLine,
    setCursorPos,
    setIsComposing,
    setCompositionAnchor,
    syncImeTokenPicker,
    focusPrompt,
    resetNavTranslateSession
  })
"""

USE_SHELL_KEYBOARD = """
  const { onKeyDown } = useShellKeyboard({
    navPageTyping,
    navTypingMultiline,
    promptPaneFocused,
    sessionNameTypingRef,
    mode,
    history,
    histNavIndex,
    histDraft,
    iSearchMatches,
    iSearchSnapshot,
    iSearchCycle,
    navArmed,
    isFocusedPane,
    paneFocus,
    navKeyboardEnabled,
    navTypingMode,
    navMenuOpen,
    navTextSelPicking,
    navTextSelDone,
    navTextSelPhase,
    tabPicker,
    sidePickerOpen,
    sessionId,
    lineRef,
    cursorRef,
    paneFocusRef,
    tabPressSeqRef,
    allowEmptyFirstPickerSyncRef,
    tabPickerOpenRequestRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    completionCandidatesRef,
    subCmdPickerRef,
    sessionListPickerHiRef,
    sessionListPickerRowsRef,
    sessionPickerVariantRef,
    tabPickerRef,
    searchListPickerRef,
    jobRunner,
    setLine,
    setCursorPos,
    setMode,
    setHistNavIndex,
    setHistDraft,
    setISearchCycle,
    setISearchSnapshot,
    setSubCmdPicker,
    setSessionListPickerHi,
    skipHistResetRef,
    focusPrompt,
    submitLine,
    syncImeTokenPicker,
    dismissImeTokenPicker,
    cancelSearchPageScan,
    closeSessionNameTyping,
    closeSessionListPicker,
    applySessionSwitchPick,
    switchSessionFromListPicker,
    handleToggleNavActive,
    promptLine
  })
"""


def drop_lines(lines: list[str], start: int, end: int) -> None:
    """Drop 1-based inclusive line range."""
    del lines[start - 1 : end]


def insert_after(lines: list[str], line_no: int, text: str) -> None:
    """Insert text after 1-based line number."""
    chunk = text.splitlines(keepends=True)
    if chunk and not chunk[-1].endswith("\n"):
        chunk[-1] += "\n"
    lines[line_no:line_no] = chunk


def remove_import_lines(lines: list[str], needles: list[str]) -> None:
    out: list[str] = []
    for line in lines:
        if any(n in line for n in needles):
            continue
        out.append(line)
    lines[:] = out


def main() -> None:
    text = SHELL.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    # Drop moved blocks first (1-based inclusive, bottom-up).
    for start, end in [
        (1348, 2065),
        (992, 1265),
        (938, 990),
        (868, 898),
        (694, 847),
        (677, 692),
        (645, 659),
        (621, 627),
        (587, 606),
        (477, 490),
        (438, 454),
        (273, 277),
    ]:
        drop_lines(lines, start, end)

    joined = "".join(lines)

    anchor = 'import { useSettingPickerShell } from "./shell/useSettingPickerShell"\n'
    if "usePromptPickers" not in joined:
        idx = lines.index(anchor)
        hook_lines = HOOK_IMPORTS.splitlines(keepends=True)
        lines[idx + 1 : idx + 1] = hook_lines

    # Remove unused imports (whole lines only).
    unused_line_substrings = [
        'import { flushSync } from "react-dom"',
        "NAV_ENTER_TYPING_EVENT,",
        "NAV_EXIT_TYPING_EVENT,",
        "type NavEnterTypingDetail,",
        'import { useDetailBarKeyboard }',
        "TokenPickerPanel, type TokenPickerModel",
        'import { logBmxtKey }',
        "CSP_DYNAMIC_SCOPE_ATTR,",
        "useCspDynamicStyle",
        "measureFloatingPickerHostPosition,",
        "shouldAutoSubmitAfterTokenPick,",
        "shouldKeepSessionSwitchPickerOpen",
        "filterSessionSwitchPickerRows,",
        "resolveSessionSwitchPickerState,",
        "type SessionCandidatePanelVariant,",
        'import { incrementalPickerMatchMode, resolveImeTokenPicker }',
        "listTabsMoveUrlCandidates,",
        "tabsMoveUrlCompletionZone",
        "navTypingInsert,",
        "navTypingShouldPreventLineBreakInput,",
        "normalizeNavTypingInitialValue,",
        "sanitizeNavTypingDomValueWithCursor,",
        "sanitizeNavTypingInsertText",
        "detailBarToPickerSlot,",
        "isPickerDetailBar,",
        "listVisibleDetailBars,",
        "pickerSlotToDetailBar,",
        "resolvePickerColumnOrder,",
        "parseSessionListPickerLine,",
    ]
    remove_import_lines(lines, unused_line_substrings)

    joined = "".join(lines)
    if "promptMirrorSegments" not in joined:
        nav_prompt = 'import { ModeStatusBarStack } from "./mode-status-bar-stack"\n'
        idx = lines.index(nav_prompt)
        lines.insert(
            idx,
            'import { promptMirrorSegments } from "../nav/nav-prompt-input"\n',
        )

    # Collapse empty nav-prompt import if only promptMirrorSegments was kept inline
    for i, line in enumerate(lines):
        if line.startswith("} from \"../nav/nav-prompt-input\"") and i > 0:
            prev = lines[i - 1]
            if prev.strip() == "promptMirrorSegments,":
                lines[i - 2 : i + 1] = [
                    'import { promptMirrorSegments } from "../nav/nav-prompt-input"\n'
                ]
                break

    def find(sub: str) -> int:
        for i, line in enumerate(lines, start=1):
            if sub in line:
                return i
        raise SystemExit(f"anchor not found: {sub!r}")

    submit_anchor = find("  /** EN: Controlled `value` fights browser/IME")
    insert_after(lines, submit_anchor - 1, USE_SHELL_KEYBOARD)
    insert_after(lines, submit_anchor - 1, USE_NAV_BRIDGE)

    actions_start = find("  } = useSessionPromptActions({")
    actions_close = actions_start
    while actions_close <= len(lines):
        if lines[actions_close - 1].rstrip() == "  })":
            break
        actions_close += 1
    else:
        raise SystemExit("useSessionPromptActions close not found")
    insert_after(lines, actions_close, USE_PANE_FOCUS)

    cursor_layout = find("  }, [line, cursorPos, isComposing])")
    insert_after(lines, cursor_layout, USE_PROMPT_PICKERS)

    SHELL.write_text("".join(lines), encoding="utf-8")
    print(f"Patched {SHELL} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
