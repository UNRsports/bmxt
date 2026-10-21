/** EN: Extensible tutorial schema (assert vocabulary + step/lesson defs). */

import type { ImeTokenTier } from "../command-line/ime-token-picker"

export const TUTORIAL_SCHEMA_VERSION = 1 as const

export type TutorialAssert =
  | { kind: "promptEquals"; value: string }
  | { kind: "promptMatches"; pattern: string }
  | { kind: "promptTokenPrefix"; tokens: readonly string[] }
  | { kind: "tokenPickerVisible"; tier?: ImeTokenTier }
  | { kind: "tokenPickerHas"; token: string }
  | { kind: "tabsPickerOpen" }
  | { kind: "all"; of: readonly TutorialAssert[] }
  | { kind: "any"; of: readonly TutorialAssert[] }

export type TutorialStep = {
  id: string
  /** EN: Primary instruction (i18n key). */
  instructionKey: string
  /** EN: Softer hint under the instruction (i18n key). */
  hintKey?: string
  assert: TutorialAssert
}

export type TutorialDefinition = {
  id: string
  titleKey: string
  steps: readonly TutorialStep[]
}

/** EN: Shell snapshot fed to the assert evaluator (pure). */
export type TutorialObservation = {
  promptLine: string
  tokenPicker: {
    visible: boolean
    tier: ImeTokenTier | null
    candidates: readonly string[]
  }
  tabsPickerOpen: boolean
}

export type TutorialProgressStatus = "not_started" | "in_progress" | "completed" | "skipped"

export type TutorialProgressEntry = {
  status: TutorialProgressStatus
  /** EN: Index of the first unsatisfied step while in_progress. */
  stepIndex: number
}

export type TutorialProgressStore = {
  schemaVersion: typeof TUTORIAL_SCHEMA_VERSION
  /** EN: First-run auto-start suppressed after skip or completion of the default lesson. */
  dismissedFirstRun: boolean
  tutorials: Record<string, TutorialProgressEntry>
}

export type TutorialRuntimeView = {
  tutorialId: string
  titleKey: string
  stepIndex: number
  stepCount: number
  step: TutorialStep
  completed: boolean
}
