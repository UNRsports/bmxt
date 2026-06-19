import { useCallback, useEffect, useRef, useState } from "react"

import { appendSearchLoadingProgressLine } from "./search-list-progress"

/**
 * EN: Progress lines for `search -list` loading — local to one shell, rAF-batched.
 * JA: 走査進捗は pickersBySession を毎 tick 更新せず、シェル内 state に集約する。
 */
export function useBatchedSearchLoadingProgress(): {
  lines: readonly string[]
  reset: (initial: readonly string[]) => void
  append: (message: string) => void
  clear: () => void
} {
  const linesRef = useRef<string[]>([])
  const rafRef = useRef<number | null>(null)
  const [lines, setLines] = useState<readonly string[]>([])

  const flush = useCallback(() => {
    rafRef.current = null
    setLines(linesRef.current)
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) {
      return
    }
    rafRef.current = requestAnimationFrame(flush)
  }, [flush])

  const reset = useCallback(
    (initial: readonly string[]) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      linesRef.current = [...initial]
      setLines(linesRef.current)
    },
    []
  )

  const append = useCallback(
    (message: string) => {
      linesRef.current = appendSearchLoadingProgressLine(linesRef.current, message)
      scheduleFlush()
    },
    [scheduleFlush]
  )

  const clear = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    linesRef.current = []
    setLines([])
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return { lines, reset, append, clear }
}
