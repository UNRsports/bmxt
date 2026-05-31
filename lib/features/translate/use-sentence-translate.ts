import { useCallback, useEffect, useRef, useState } from "react"
import { listCompleteSentences } from "./sentence-boundary"
import {
  isBuiltInTranslatorSupported,
  jaEnPairAvailability,
  resetTranslatorInstances,
  translateJaEnJa,
  type TranslationTriplet
} from "./translator-service"
import type { TranslationBlock } from "./translation-strip"

const MAX_BLOCKS = 8

type Options = {
  active: boolean
  buffer: string
  isComposing: boolean
}

function sentencesKey(sentences: readonly string[]): string {
  return sentences.join("\0")
}

function pendingBlocks(sentences: readonly string[], nextId: () => number): TranslationBlock[] {
  return sentences.map((source) => ({
    id: nextId(),
    source,
    forward: "",
    back: ""
  }))
}

export function useSentenceTranslate({ active, buffer, isComposing }: Options): {
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
  const lastSentencesKeyRef = useRef("")
  const nextIdRef = useRef(1)
  const queueRef = useRef(Promise.resolve())
  const abortRef = useRef<AbortController | null>(null)

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
    lastSentencesKeyRef.current = ""
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
    if (!active || isComposing) {
      return
    }

    const sentences = listCompleteSentences(buffer).slice(-MAX_BLOCKS)
    const key = sentencesKey(sentences)

    if (sentences.length === 0) {
      if (lastSentencesKeyRef.current !== "") {
        lastSentencesKeyRef.current = ""
        setBlocks([])
      }
      return
    }

    if (key === lastSentencesKeyRef.current) {
      return
    }
    lastSentencesKeyRef.current = key

    const run = async () => {
      if (!isBuiltInTranslatorSupported()) {
        setStatusNote("Translator API unavailable (Chrome 138+ desktop).")
        return
      }
      const avail = await jaEnPairAvailability()
      if (avail === "unsupported" || avail === "unavailable") {
        setStatusNote(
          avail === "unsupported"
            ? "Translator API unavailable (Chrome 138+ desktop)."
            : "ja→en language pack unavailable on this device."
        )
        return
      }
      setStatusNote(
        avail === "downloadable"
          ? "Downloading Chrome translation model (first use)…"
          : null
      )
      setBusy(true)
      setBlocks(pendingBlocks(sentences, nextBlockId))
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const results: TranslationBlock[] = []
        for (const sentence of sentences) {
          if (ac.signal.aborted) {
            return
          }
          const triplet: TranslationTriplet = await translateJaEnJa(sentence, ac.signal)
          results.push({ ...triplet, id: nextBlockId() })
        }
        if (ac.signal.aborted) {
          return
        }
        setBlocks(results)
        setStatusNote(null)
      } catch (e) {
        if (ac.signal.aborted) {
          return
        }
        const msg = e instanceof Error ? e.message : String(e)
        setStatusNote(`translation failed: ${msg}`)
      } finally {
        if (!ac.signal.aborted) {
          setBusy(false)
        }
      }
    }

    queueRef.current = queueRef.current.then(run, run)
  }, [active, buffer, isComposing, nextBlockId])

  return { blocks, busy, statusNote, resetSession, flushPendingTranslations, setCommitError }
}
