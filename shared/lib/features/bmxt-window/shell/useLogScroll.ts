import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

type UseLogScrollOptions = {
  lines: string[]
  mode: string
  line: string
  postUpgradeBanner: unknown
  /** EN: Changes when prompt foot chrome (pickers, detail bars) mounts or resizes. */
  promptFootSignature: string
}

const NEAR_BOTTOM_PX = 64
/** EN: Match `.bmxt-split-terminal-pane` flex transition (~280ms) plus a frame. */
const LAYOUT_SETTLE_MS = 320

function isNearBottom(el: HTMLElement, thresholdPx = NEAR_BOTTOM_PX): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx
}

/** EN: Terminal log scroll region — keep prompt foot (caret / detail bars) in view. */
export function useLogScroll({
  lines,
  mode,
  line,
  postUpgradeBanner,
  promptFootSignature
}: UseLogScrollOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const [logScrollable, setLogScrollable] = useState(false)

  const syncLogScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const needs = el.scrollHeight > el.clientHeight + 1
    setLogScrollable(needs)
  }, [])

  const scrollPromptFootIntoView = useCallback(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    stickToBottomRef.current = true
    // EN: Do not use scrollIntoView — it scrolls ancestors and fights picker focus.
    container.scrollTop = container.scrollHeight
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      el.scrollTop = el.scrollHeight
      syncLogScroll()
    })
  }, [syncLogScroll])

  useLayoutEffect(() => {
    syncLogScroll()
  }, [lines, mode, line, syncLogScroll, postUpgradeBanner, promptFootSignature])

  useLayoutEffect(() => {
    scrollPromptFootIntoView()
    // EN: Rail flex transition finishes after the first layout; re-pin the foot.
    const settleId = window.setTimeout(() => {
      scrollPromptFootIntoView()
    }, LAYOUT_SETTLE_MS)
    return () => {
      window.clearTimeout(settleId)
    }
  }, [lines, scrollPromptFootIntoView, postUpgradeBanner, promptFootSignature])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el)
    }
    el.addEventListener("scroll", onScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollPromptFootIntoView()
      } else {
        syncLogScroll()
      }
    })
    ro.observe(el)

    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [scrollPromptFootIntoView, syncLogScroll])

  return {
    scrollRef,
    scrollAnchorRef,
    logScrollable,
    syncLogScroll,
    scrollPromptFootIntoView
  }
}
