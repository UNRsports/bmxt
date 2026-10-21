import { TAB_LIST_BROWSE_TUTORIAL } from "./tutorials/tab-list-browse.ts"
import type { TutorialDefinition } from "./types.ts"

/** EN: Default lesson for first-run auto-start and bare `tutorial`. */
export const DEFAULT_TUTORIAL_ID = TAB_LIST_BROWSE_TUTORIAL.id

const TUTORIALS: readonly TutorialDefinition[] = [TAB_LIST_BROWSE_TUTORIAL]

const BY_ID = new Map<string, TutorialDefinition>(
  TUTORIALS.map((tutorial) => [tutorial.id, tutorial])
)

export function listTutorials(): readonly TutorialDefinition[] {
  return TUTORIALS
}

export function getTutorialById(id: string): TutorialDefinition | null {
  return BY_ID.get(id) ?? null
}

export function getDefaultTutorial(): TutorialDefinition {
  const tutorial = BY_ID.get(DEFAULT_TUTORIAL_ID)
  if (tutorial === undefined) {
    throw new Error(`default tutorial missing: ${DEFAULT_TUTORIAL_ID}`)
  }
  return tutorial
}
