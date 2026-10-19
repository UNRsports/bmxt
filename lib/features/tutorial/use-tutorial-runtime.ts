import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { resolveSatisfiedStepIndex } from "./assert"
import {
  DEFAULT_TUTORIAL_ID,
  getDefaultTutorial,
  getTutorialById
} from "./catalog"
import { buildTutorialObservation, type TokenPickerObservationInput } from "./observation"
import {
  loadTutorialProgressStore,
  saveTutorialProgressStore,
  shouldAutoStartDefaultTutorial,
  withTutorialCompleted,
  withTutorialSkipped,
  withTutorialStarted,
  withTutorialStep
} from "./progress-storage"
import type {
  TutorialProgressStore,
  TutorialRuntimeView
} from "./types"

export type UseTutorialRuntimeOptions = {
  promptLine: string
  tokenPicker: TokenPickerObservationInput
  tabsPickerOpen: boolean
  /** EN: When false, skip first-run auto-start (e.g. float host). */
  enableFirstRunAutoStart: boolean
}

export type TutorialRuntimeApi = {
  view: TutorialRuntimeView | null
  ready: boolean
  startTutorial: (tutorialId?: string) => void
  skipTutorial: () => void
}

function emptyProgressStore(): TutorialProgressStore {
  return {
    schemaVersion: 1,
    dismissedFirstRun: false,
    tutorials: {}
  }
}

export function useTutorialRuntime(
  options: UseTutorialRuntimeOptions
): TutorialRuntimeApi {
  const [store, setStore] = useState<TutorialProgressStore | null>(null)
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve())
  const storeRef = useRef<TutorialProgressStore | null>(null)
  storeRef.current = store

  const persist = useCallback((next: TutorialProgressStore) => {
    setStore(next)
    storeRef.current = next
    persistQueueRef.current = persistQueueRef.current
      .then(() => saveTutorialProgressStore(next))
      .catch(() => {
        /* EN: Storage failures must not break the shell. */
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadTutorialProgressStore().then((loaded) => {
      if (cancelled) {
        return
      }
      setStore(loaded)
      storeRef.current = loaded
      if (options.enableFirstRunAutoStart && shouldAutoStartDefaultTutorial(loaded)) {
        const started = withTutorialStarted(loaded, DEFAULT_TUTORIAL_ID)
        setActiveTutorialId(DEFAULT_TUTORIAL_ID)
        setStepIndex(0)
        persist(started)
      }
    })
    return () => {
      cancelled = true
    }
    // EN: First-run decision once after storage load.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only auto-start
  }, [])

  const startTutorial = useCallback(
    (tutorialId?: string) => {
      const id = tutorialId ?? DEFAULT_TUTORIAL_ID
      const def = getTutorialById(id)
      if (def === null) {
        return
      }
      setActiveTutorialId(id)
      setStepIndex(0)
      const base = storeRef.current ?? emptyProgressStore()
      persist(withTutorialStarted(base, id))
    },
    [persist]
  )

  const skipTutorial = useCallback(() => {
    const id = activeTutorialId ?? DEFAULT_TUTORIAL_ID
    const base = storeRef.current ?? emptyProgressStore()
    setActiveTutorialId(null)
    setStepIndex(0)
    persist(withTutorialSkipped(base, id))
  }, [activeTutorialId, persist])

  const tokenPickerKey =
    options.tokenPicker === null
      ? ""
      : `${options.tokenPicker.tier}\0${options.tokenPicker.candidates.join("\0")}`

  const observation = useMemo(
    () =>
      buildTutorialObservation({
        promptLine: options.promptLine,
        tokenPicker: options.tokenPicker,
        tabsPickerOpen: options.tabsPickerOpen
      }),
    // EN: tokenPicker object identity changes often; key captures content.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tokenPickerKey stands in for tokenPicker
    [options.promptLine, options.tabsPickerOpen, tokenPickerKey]
  )

  useEffect(() => {
    if (activeTutorialId === null) {
      return
    }
    const tutorial = getTutorialById(activeTutorialId)
    if (tutorial === null) {
      return
    }
    const satisfied = resolveSatisfiedStepIndex(tutorial.steps, observation)
    if (satisfied <= stepIndex) {
      return
    }
    setStepIndex(satisfied)
    const base = storeRef.current ?? emptyProgressStore()
    if (satisfied >= tutorial.steps.length) {
      persist(withTutorialCompleted(base, activeTutorialId))
      setActiveTutorialId(null)
      return
    }
    persist(withTutorialStep(base, activeTutorialId, satisfied))
  }, [activeTutorialId, observation, persist, stepIndex])

  const view = useMemo((): TutorialRuntimeView | null => {
    if (activeTutorialId === null) {
      return null
    }
    const tutorial = getTutorialById(activeTutorialId) ?? getDefaultTutorial()
    const clamped = Math.min(stepIndex, Math.max(0, tutorial.steps.length - 1))
    const step = tutorial.steps[clamped]
    if (step === undefined) {
      return null
    }
    return {
      tutorialId: tutorial.id,
      titleKey: tutorial.titleKey,
      stepIndex: clamped,
      stepCount: tutorial.steps.length,
      step,
      completed: false
    }
  }, [activeTutorialId, stepIndex])

  return {
    view,
    ready: store !== null,
    startTutorial,
    skipTutorial
  }
}
