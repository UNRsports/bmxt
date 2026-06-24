import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

export type UseLogScrollOptions = {
  lines: readonly string[]
  mode: "normal" | "isearch"
  line: string
  postUpgradeBanner: unknown
}

/** EN: Terminal log scroll region — auto-scroll and overflow detection. */
export function useLogScroll({ lines, mode, line, postUpgradeBanner }: UseLogScrollOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [logScrollable, setLogScrollable] = useState(false)

  const syncLogScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const needs = el.scrollHeight > el.clientHeight + 1
    setLogScrollable(needs)
  }, [])

  useLayoutEffect(() => {
    syncLogScroll()
  }, [lines, mode, line, syncLogScroll, postUpgradeBanner])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => syncLogScroll())
    ro.observe(el)
    return () => ro.disconnect()
  }, [syncLogScroll])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [lines, syncLogScroll, postUpgradeBanner])

  return { scrollRef, logScrollable, syncLogScroll }
}
