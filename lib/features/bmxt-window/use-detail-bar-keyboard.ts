import { useCallback, useLayoutEffect, useRef } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import {
  TRANSLATION_PAIR_IDS,
  type TranslationPairId
} from "../translate/translation-pair"
import {
  cycleDetailBarId,
  isPickerDetailBar,
  resolveDetailBarFocusTarget,
  type DetailBarId
} from "./detail-bar-focus"

function isPlainVerticalNav(e: KeyboardEvent): "up" | "down" | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return null
  }
  if (e.key === "ArrowUp" || e.code === "ArrowUp") {
    return "up"
  }
  if (e.key === "ArrowDown" || e.code === "ArrowDown") {
    return "down"
  }
  return null
}

function isPlainHorizontal(e: KeyboardEvent): "left" | "right" | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return null
  }
  if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
    return "left"
  }
  if (e.key === "ArrowRight" || e.code === "ArrowRight") {
    return "right"
  }
  return null
}

function isAltDetailBarKey(e: KeyboardEvent): boolean {
  return e.key === "Alt" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat
}

export type DetailBarKeyboardActions = {
  activateDetailBar: (id: DetailBarId) => void
  enterPickerFromDetailBar: () => void
  exitDetailBarToTerminal: () => void
  toggleNavActive: () => void
  cycleTranslatePair: (direction: 1 | -1) => void
  toggleTabsPageActive?: () => void
  toggleSearchPageActive?: () => void
}

export type UseDetailBarKeyboardOptions = {
  enabled: boolean
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  visibleDetailBars: readonly DetailBarId[]
  detailBarId: DetailBarId | null
  navArmed: boolean
  /** EN: Nav overlay ON — arrows belong to page cursor, not detail bars. */
  navActive: boolean
  /** EN: Nav typing mode — Alt is commit-hold, not overlay toggle. */
  navTypingMode: boolean
  blocked: boolean
  /** EN: True when the prompt caret is at end-of-line (→ enters detail bar). */
  isCaretAtPromptEnd: () => boolean
  actions: DetailBarKeyboardActions
}

export function cycleTranslationPairId(
  current: TranslationPairId,
  direction: 1 | -1
): TranslationPairId {
  const index = TRANSLATION_PAIR_IDS.indexOf(current)
  const next = (index + direction + TRANSLATION_PAIR_IDS.length) % TRANSLATION_PAIR_IDS.length
  return TRANSLATION_PAIR_IDS[next]!
}

export function useDetailBarKeyboard({
  enabled,
  isFocusedPane,
  paneFocus,
  visibleDetailBars,
  detailBarId,
  navArmed,
  navActive,
  navTypingMode,
  blocked,
  isCaretAtPromptEnd,
  actions
}: UseDetailBarKeyboardOptions): void {
  const paneFocusRef = useRef(paneFocus)
  const detailBarIdRef = useRef(detailBarId)
  const visibleRef = useRef(visibleDetailBars)
  const actionsRef = useRef(actions)
  const isCaretAtPromptEndRef = useRef(isCaretAtPromptEnd)
  const navTypingModeRef = useRef(navTypingMode)
  const navActiveRef = useRef(navActive)
  paneFocusRef.current = paneFocus
  detailBarIdRef.current = detailBarId
  visibleRef.current = visibleDetailBars
  actionsRef.current = actions
  isCaretAtPromptEndRef.current = isCaretAtPromptEnd
  navTypingModeRef.current = navTypingMode
  navActiveRef.current = navActive

  const navClaimsArrows = (): boolean => navArmed && navActiveRef.current

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !isFocusedPane || blocked || e.isComposing) {
        return
      }
      const focus = paneFocusRef.current
      const bars = visibleRef.current

      if (focus === "terminal") {
        if (isAltDetailBarKey(e) && navArmed && !navTypingModeRef.current) {
          e.preventDefault()
          e.stopImmediatePropagation()
          actionsRef.current.toggleNavActive()
          return
        }
        if (bars.length === 0) {
          return
        }
        const horiz = isPlainHorizontal(e)
        if (horiz === "right" && isCaretAtPromptEndRef.current() && !navClaimsArrows()) {
          const target = resolveDetailBarFocusTarget(bars, detailBarIdRef.current)
          if (target) {
            e.preventDefault()
            e.stopImmediatePropagation()
            actionsRef.current.activateDetailBar(target)
          }
        }
        return
      }

      if (bars.length === 0) {
        return
      }

      if (focus !== "detailBar") {
        return
      }

      const current = detailBarIdRef.current
      const horiz = isPlainHorizontal(e)

      if (horiz === "left") {
        e.preventDefault()
        e.stopImmediatePropagation()
        actionsRef.current.exitDetailBarToTerminal()
        return
      }

      if (horiz === "right" && current !== null && isPickerDetailBar(current)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        actionsRef.current.enterPickerFromDetailBar()
        return
      }

      if (isAltDetailBarKey(e) && current !== null) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (current === "nav" && navArmed) {
          actionsRef.current.toggleNavActive()
          return
        }
        if (current === "translate") {
          actionsRef.current.cycleTranslatePair(1)
          return
        }
        if (current === "tabs") {
          actionsRef.current.toggleTabsPageActive?.()
          return
        }
        if (current === "search") {
          actionsRef.current.toggleSearchPageActive?.()
        }
        return
      }

      const vertDir = isPlainVerticalNav(e)
      if (vertDir) {
        if (navClaimsArrows()) {
          return
        }
        e.preventDefault()
        e.stopImmediatePropagation()
        const next = cycleDetailBarId(bars, current, vertDir)
        if (next) {
          actionsRef.current.activateDetailBar(next)
        }
      }
    },
    [blocked, enabled, isFocusedPane, navArmed]
  )

  useLayoutEffect(() => {
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [onKeyDown])
}
