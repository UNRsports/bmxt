import { useCallback, useLayoutEffect, useRef } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type { PickerSlotId } from "../side-picker/session/session-pickers"
import {
  TRANSLATION_PAIR_IDS,
  type TranslationPairId
} from "../translate/translation-pair"
import {
  cycleDetailBarId,
  isPickerDetailBar,
  type DetailBarId
} from "./detail-bar-focus"

function isAltVerticalNav(e: KeyboardEvent): "up" | "down" | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
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

export type DetailBarKeyboardActions = {
  activateDetailBar: (id: DetailBarId) => void
  enterPickerFromDetailBar: () => void
  exitDetailBarToTerminal: () => void
  toggleNavActive: () => void
  cycleTranslatePair: (direction: 1 | -1) => void
}

export type UseDetailBarKeyboardOptions = {
  enabled: boolean
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  visibleDetailBars: readonly DetailBarId[]
  detailBarId: DetailBarId | null
  navArmed: boolean
  blocked: boolean
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
  blocked,
  actions
}: UseDetailBarKeyboardOptions): void {
  const paneFocusRef = useRef(paneFocus)
  const detailBarIdRef = useRef(detailBarId)
  const visibleRef = useRef(visibleDetailBars)
  const actionsRef = useRef(actions)
  paneFocusRef.current = paneFocus
  detailBarIdRef.current = detailBarId
  visibleRef.current = visibleDetailBars
  actionsRef.current = actions

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !isFocusedPane || blocked || e.isComposing) {
        return
      }
      const focus = paneFocusRef.current
      const bars = visibleRef.current
      if (bars.length === 0) {
        return
      }

      const altDir = isAltVerticalNav(e)
      if (altDir && (focus === "terminal" || focus === "detailBar")) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const next = cycleDetailBarId(bars, detailBarIdRef.current, altDir)
        if (next) {
          actionsRef.current.activateDetailBar(next)
        }
        return
      }

      if (focus !== "detailBar") {
        return
      }

      const current = detailBarIdRef.current
      if (!current) {
        return
      }

      const horiz = isPlainHorizontal(e)
      if (!horiz) {
        return
      }

      if (current === "nav" && navArmed) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (!e.repeat) {
          actionsRef.current.toggleNavActive()
        }
        return
      }

      if (current === "translate") {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (!e.repeat) {
          actionsRef.current.cycleTranslatePair(horiz === "right" ? 1 : -1)
        }
        return
      }

      if (isPickerDetailBar(current)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (horiz === "right") {
          actionsRef.current.enterPickerFromDetailBar()
        } else {
          actionsRef.current.exitDetailBarToTerminal()
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
