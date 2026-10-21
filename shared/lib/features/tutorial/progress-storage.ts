import { TUTORIAL_PROGRESS_KEY } from "../extension-storage/keys.ts"
import { DEFAULT_TUTORIAL_ID } from "./catalog.ts"
import {
  TUTORIAL_SCHEMA_VERSION,
  type TutorialProgressEntry,
  type TutorialProgressStore
} from "./types.ts"

function emptyStore(): TutorialProgressStore {
  return {
    schemaVersion: TUTORIAL_SCHEMA_VERSION,
    dismissedFirstRun: false,
    tutorials: {}
  }
}

function isProgressEntry(raw: unknown): raw is TutorialProgressEntry {
  if (raw === null || typeof raw !== "object") {
    return false
  }
  const entry = raw as Record<string, unknown>
  const status = entry.status
  if (
    status !== "not_started" &&
    status !== "in_progress" &&
    status !== "completed" &&
    status !== "skipped"
  ) {
    return false
  }
  if (typeof entry.stepIndex !== "number" || !Number.isFinite(entry.stepIndex)) {
    return false
  }
  if (entry.stepIndex < 0) {
    return false
  }
  return true
}

export function parseTutorialProgressStore(raw: unknown): TutorialProgressStore {
  if (raw === null || typeof raw !== "object") {
    return emptyStore()
  }
  const obj = raw as Record<string, unknown>
  if (obj.schemaVersion !== TUTORIAL_SCHEMA_VERSION) {
    return emptyStore()
  }
  const tutorials: Record<string, TutorialProgressEntry> = {}
  if (obj.tutorials !== null && typeof obj.tutorials === "object") {
    for (const [id, entry] of Object.entries(obj.tutorials as Record<string, unknown>)) {
      if (typeof id !== "string" || id.length === 0 || id.length > 128) {
        continue
      }
      if (!isProgressEntry(entry)) {
        continue
      }
      tutorials[id] = {
        status: entry.status,
        stepIndex: Math.floor(entry.stepIndex)
      }
    }
  }
  return {
    schemaVersion: TUTORIAL_SCHEMA_VERSION,
    dismissedFirstRun: obj.dismissedFirstRun === true,
    tutorials
  }
}

export async function loadTutorialProgressStore(): Promise<TutorialProgressStore> {
  const result = await chrome.storage.local.get(TUTORIAL_PROGRESS_KEY)
  return parseTutorialProgressStore(result[TUTORIAL_PROGRESS_KEY])
}

export async function saveTutorialProgressStore(
  store: TutorialProgressStore
): Promise<void> {
  await chrome.storage.local.set({ [TUTORIAL_PROGRESS_KEY]: store })
}

export function shouldAutoStartDefaultTutorial(store: TutorialProgressStore): boolean {
  if (store.dismissedFirstRun) {
    return false
  }
  const entry = store.tutorials[DEFAULT_TUTORIAL_ID]
  if (entry === undefined) {
    return true
  }
  if (entry.status === "completed" || entry.status === "skipped") {
    return false
  }
  return true
}

export function withTutorialStarted(
  store: TutorialProgressStore,
  tutorialId: string
): TutorialProgressStore {
  return {
    ...store,
    tutorials: {
      ...store.tutorials,
      [tutorialId]: { status: "in_progress", stepIndex: 0 }
    }
  }
}

export function withTutorialStep(
  store: TutorialProgressStore,
  tutorialId: string,
  stepIndex: number
): TutorialProgressStore {
  return {
    ...store,
    tutorials: {
      ...store.tutorials,
      [tutorialId]: { status: "in_progress", stepIndex }
    }
  }
}

export function withTutorialCompleted(
  store: TutorialProgressStore,
  tutorialId: string
): TutorialProgressStore {
  return {
    ...store,
    dismissedFirstRun: true,
    tutorials: {
      ...store.tutorials,
      [tutorialId]: { status: "completed", stepIndex: 0 }
    }
  }
}

export function withTutorialSkipped(
  store: TutorialProgressStore,
  tutorialId: string
): TutorialProgressStore {
  return {
    ...store,
    dismissedFirstRun: true,
    tutorials: {
      ...store.tutorials,
      [tutorialId]: { status: "skipped", stepIndex: 0 }
    }
  }
}
