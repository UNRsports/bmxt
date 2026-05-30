import { useCallback, useEffect, useRef, useState } from "react"
import { takeNewCompleteSentence } from "./sentence-boundary"
import {
  isBuiltInTranslatorSupported,
  jaEnPairAvailability,
  resetTranslatorInstances,
  translateJaEnJa,
  type TranslationTriplet
} from "./translator-service"
import type { TypingTranslateBlock } from "./typing-translate-strip"

const MAX_BLOCKS = 8

type Options = {
  active: boolean
  buffer: string
  isComposing: boolean
}

export function useTypingTranslate({ active, buffer, isComposing }: Options): {
  blocks: readonly TypingTranslateBlock[]
  busy: boolean
  statusNote: string | null
  resetSession: () => void
} {
  const [blocks, setBlocks] = useState<TypingTranslateBlock[]>([])
  const [busy, setBusy] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const lastTranslatedEndRef = useRef(0)
  const prefixAtLastEndRef = useRef("")
  const nextIdRef = useRef(1)
  const queueRef = useRef(Promise.resolve())
  const abortRef = useRef<AbortController | null>(null)

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    lastTranslatedEndRef.current = 0
    prefixAtLastEndRef.current = ""
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

    const prefix = buffer.slice(0, lastTranslatedEndRef.current)
    if (prefix !== prefixAtLastEndRef.current) {
      lastTranslatedEndRef.current = 0
      prefixAtLastEndRef.current = ""
    }

    const found = takeNewCompleteSentence(buffer, lastTranslatedEndRef.current)
    if (!found) {
      return
    }

    const { sentence, end } = found
    lastTranslatedEndRef.current = end
    prefixAtLastEndRef.current = buffer.slice(0, end)

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
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const triplet: TranslationTriplet = await translateJaEnJa(sentence, ac.signal)
        if (ac.signal.aborted) {
          return
        }
        const id = nextIdRef.current++
        setBlocks((prev) => [...prev.slice(-(MAX_BLOCKS - 1)), { ...triplet, id }])
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
  }, [active, buffer, isComposing])

  return { blocks, busy, statusNote, resetSession }
}
