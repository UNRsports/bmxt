import { useCallback, useEffect, useRef, useState } from "react"
import {
  extractPendingSource,
  pendingSegmentKey,
  reconcileBlocksInBuffer
} from "./translation-segments"
import {
  DEFAULT_TRANSLATION_PAIR_ID,
  getTranslationPairDef,
  type TranslationPairId
} from "./translation-pair"
import {
  isBuiltInTranslatorSupported,
  pairAvailability,
  resetTranslatorInstances,
  translateRoundTripMultiline
} from "./translator-service"
import type { TranslationBlock } from "./translation-strip"

const MAX_BLOCKS = 8
const DEBOUNCE_MS = 500

type Options = {
  active: boolean
  buffer: string
  isComposing: boolean
  pairId?: TranslationPairId
}

function trimBlocks(blocks: readonly TranslationBlock[]): TranslationBlock[] {
  if (blocks.length <= MAX_BLOCKS) {
    return [...blocks]
  }
  return blocks.slice(-MAX_BLOCKS)
}

export function useSentenceTranslate({
  active,
  buffer,
  isComposing,
  pairId = DEFAULT_TRANSLATION_PAIR_ID
}: Options): {
  blocks: readonly TranslationBlock[]
  busy: boolean
  statusNote: string | null
  resetSession: () => void
  flushPendingTranslations: () => Promise<void>
  setCommitError: (message: string | null) => void
} {
  const [blocks, setBlocks] = useState<TranslationBlock[]>([])
  const [busy, setBusy] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const nextIdRef = useRef(1)
  const queueRef = useRef(Promise.resolve())
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef(buffer)
  const blocksRef = useRef(blocks)
  const inFlightKeyRef = useRef<string | null>(null)

  bufferRef.current = buffer
  blocksRef.current = blocks

  const nextBlockId = useCallback(() => nextIdRef.current++, [])

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
    setBlocks([])
    setBusy(false)
    setStatusNote(null)
  }, [])

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
    setBlocks((prev) => {
      const next = trimBlocks(reconcileBlocksInBuffer(buffer, prev))
      if (next.length === prev.length && next.every((block, index) => {
        const prior = prev[index]
        return (
          prior !== undefined &&
          prior.id === block.id &&
          prior.start === block.start &&
          prior.end === block.end &&
          prior.source === block.source
        )
      })) {
        return prev
      }
      return next
    })
  }, [active, buffer])

  useEffect(() => {
    if (!active || isComposing) {
      return
    }

    const timer = window.setTimeout(() => {
      const matched = trimBlocks(reconcileBlocksInBuffer(bufferRef.current, blocksRef.current))
      const pending = extractPendingSource(bufferRef.current, matched)
      if (!pending) {
        return
      }

      const last = matched[matched.length - 1]
      if (
        last &&
        last.start === pending.start &&
        last.end === pending.end &&
        last.source === pending.source
      ) {
        return
      }

      const key = pendingSegmentKey(pending)
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

        const optimistic: TranslationBlock = {
          id: nextBlockId(),
          source: pending.source,
          start: pending.start,
          end: pending.end,
          forward: "",
          back: ""
        }
        setBlocks(trimBlocks([...matched, optimistic]))
        setBusy(true)
        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
          const triplet = await translateRoundTripMultiline(pairId, pending.source, ac.signal)
          if (ac.signal.aborted) {
            return
          }
          setBlocks((current) => {
            const reconciled = trimBlocks(reconcileBlocksInBuffer(bufferRef.current, current))
            const index = reconciled.findIndex(
              (block) =>
                block.start === pending.start &&
                block.end === pending.end &&
                block.source === pending.source
            )
            if (index < 0) {
              return trimBlocks([
                ...reconciled,
                { ...triplet, id: nextBlockId(), start: pending.start, end: pending.end }
              ])
            }
            return reconciled.map((block, blockIndex) =>
              blockIndex === index
                ? {
                    ...block,
                    forward: triplet.forward,
                    back: triplet.back
                  }
                : block
            )
          })
          setStatusNote(null)
        } catch (e) {
          if (ac.signal.aborted) {
            return
          }
          const msg = e instanceof Error ? e.message : String(e)
          setStatusNote(`translation failed: ${msg}`)
          setBlocks((current) =>
            trimBlocks(
              reconcileBlocksInBuffer(bufferRef.current, current).filter(
                (block) =>
                  !(
                    block.start === pending.start &&
                    block.end === pending.end &&
                    block.source === pending.source &&
                    block.forward === ""
                  )
              )
            )
          )
        } finally {
          if (!ac.signal.aborted) {
            setBusy(false)
          }
          if (inFlightKeyRef.current === key) {
            inFlightKeyRef.current = null
          }
        }
      }

      queueRef.current = queueRef.current.then(run, run)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [active, buffer, isComposing, nextBlockId, pairId])

  return { blocks, busy, statusNote, resetSession, flushPendingTranslations, setCommitError }
}
