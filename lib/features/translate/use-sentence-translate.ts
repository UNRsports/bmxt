import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_TRANSLATION_PAIR_ID,
  getTranslationPairDef,
  type TranslationPairId
} from "./translation-pair"
import {
  isBuiltInTranslatorSupported,
  pairAvailability,
  resetTranslatorInstances,
  translateForwardMultiline
} from "./translator-service"
import type { TranslationBlock } from "./translation-strip"

const DEBOUNCE_MS = 500
export const TRANSLATE_PENDING_INDICATOR_MS = 100

type Options = {
  active: boolean
  buffer: string
  isComposing: boolean
  pairId?: TranslationPairId
}

function bufferNeedsTranslation(
  buffer: string,
  blocks: readonly TranslationBlock[]
): boolean {
  if (buffer.trim().length === 0) {
    return false
  }
  const block = blocks[0]
  if (!block || block.source !== buffer) {
    return true
  }
  return block.forward.length === 0
}

export function useSentenceTranslate({
  active,
  buffer,
  isComposing,
  pairId = DEFAULT_TRANSLATION_PAIR_ID
}: Options): {
  blocks: readonly TranslationBlock[]
  busy: boolean
  translatePending: boolean
  statusNote: string | null
  resetSession: () => void
  flushPendingTranslations: () => Promise<void>
  setCommitError: (message: string | null) => void
} {
  const [blocks, setBlocks] = useState<TranslationBlock[]>([])
  const [busy, setBusy] = useState(false)
  const [translatePending, setTranslatePending] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const nextIdRef = useRef(1)
  const queueRef = useRef(Promise.resolve())
  const abortRef = useRef<AbortController | null>(null)
  const pendingTimerRef = useRef<number | null>(null)
  const bufferRef = useRef(buffer)
  const blocksRef = useRef(blocks)
  const inFlightKeyRef = useRef<string | null>(null)

  bufferRef.current = buffer
  blocksRef.current = blocks

  const nextBlockId = useCallback(() => nextIdRef.current++, [])

  const clearPendingIndicatorTimer = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
  }, [])

  const setCommitError = useCallback((message: string | null) => {
    setStatusNote(message)
  }, [])

  const flushPendingTranslations = useCallback(async () => {
    await queueRef.current
  }, [])

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    inFlightKeyRef.current = null
    clearPendingIndicatorTimer()
    setBlocks([])
    setBusy(false)
    setTranslatePending(false)
    setStatusNote(null)
  }, [clearPendingIndicatorTimer])

  useEffect(() => {
    if (!active) {
      resetSession()
      resetTranslatorInstances()
    }
  }, [active, resetSession])

  useEffect(() => {
    if (!active) {
      return
    }
    resetSession()
    resetTranslatorInstances()
  }, [active, pairId, resetSession])

  useEffect(() => {
    if (!active) {
      return
    }
    if (buffer.trim().length === 0) {
      setBlocks([])
    }
  }, [active, buffer])

  useEffect(() => {
    if (!active || isComposing) {
      return
    }

    const timer = window.setTimeout(() => {
      const sourceSnapshot = bufferRef.current
      if (sourceSnapshot.trim().length === 0) {
        setBlocks([])
        return
      }
      if (!bufferNeedsTranslation(sourceSnapshot, blocksRef.current)) {
        return
      }

      const key = sourceSnapshot
      if (inFlightKeyRef.current === key) {
        return
      }
      inFlightKeyRef.current = key

      const run = async () => {
        if (!isBuiltInTranslatorSupported()) {
          setStatusNote("Translator API unavailable (Chrome 138+ desktop).")
          inFlightKeyRef.current = null
          return
        }
        const pairDef = getTranslationPairDef(pairId)
        const avail = await pairAvailability(pairId)
        if (avail === "unsupported" || avail === "unavailable") {
          setStatusNote(
            avail === "unsupported"
              ? "Translator API unavailable (Chrome 138+ desktop)."
              : `${pairDef.sourceLanguage}→${pairDef.targetLanguage} language pack unavailable on this device.`
          )
          inFlightKeyRef.current = null
          return
        }
        setStatusNote(
          avail === "downloadable"
            ? "Downloading Chrome translation model (first use)…"
            : null
        )

        setBusy(true)
        setTranslatePending(false)
        clearPendingIndicatorTimer()
        pendingTimerRef.current = window.setTimeout(() => {
          setTranslatePending(true)
        }, TRANSLATE_PENDING_INDICATOR_MS)

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
          const result = await translateForwardMultiline(pairId, sourceSnapshot, ac.signal)
          if (ac.signal.aborted) {
            return
          }
          if (bufferRef.current !== sourceSnapshot) {
            return
          }
          setBlocks([
            {
              id: nextBlockId(),
              start: 0,
              end: sourceSnapshot.length,
              source: sourceSnapshot,
              forward: result.forward
            }
          ])
          setStatusNote(null)
        } catch (e) {
          if (ac.signal.aborted) {
            return
          }
          const msg = e instanceof Error ? e.message : String(e)
          setStatusNote(`translation failed: ${msg}`)
        } finally {
          clearPendingIndicatorTimer()
          if (!ac.signal.aborted) {
            setBusy(false)
            setTranslatePending(false)
          }
          if (inFlightKeyRef.current === key) {
            inFlightKeyRef.current = null
          }
        }
      }

      queueRef.current = queueRef.current.then(run, run)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [active, buffer, clearPendingIndicatorTimer, isComposing, nextBlockId, pairId])

  return {
    blocks,
    busy,
    translatePending,
    statusNote,
    resetSession,
    flushPendingTranslations,
    setCommitError
  }
}
