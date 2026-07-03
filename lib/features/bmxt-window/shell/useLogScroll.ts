import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

export type UseLogScrollOptions = {
  lines: readonly string[]
  mode: "normal" | "isearch"
  line: string
  postUpgradeBanner: unknown
  /** EN: When footer layout changes (prompt, detail bars, pickers), pin scroll to bottom. */
  promptFootSignature?: string
}

/** EN: Terminal log scroll region — auto-scroll and overflow detection. */
export function useLogScroll({
  lines,
  mode,
  line,
  postUpgradeBanner,
  promptFootSignature
}: UseLogScrollOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
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
    container.scrollTo({ top: container.scrollHeight, behavior: "instant" })
    scrollAnchorRef.current?.scrollIntoView({ block: "end", behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [syncLogScroll])

  useLayoutEffect(() => {
    syncLogScroll()
  }, [lines, mode, line, syncLogScroll, postUpgradeBanner, promptFootSignature])

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
    scrollPromptFootIntoView()
  }, [lines, scrollPromptFootIntoView, postUpgradeBanner, promptFootSignature])

  return { scrollRef, scrollAnchorRef, logScrollable, syncLogScroll }
}
