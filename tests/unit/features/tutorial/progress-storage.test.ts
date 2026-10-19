import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseTutorialProgressStore,
  shouldAutoStartDefaultTutorial,
  withTutorialCompleted,
  withTutorialSkipped
} from "../../../../lib/features/tutorial/progress-storage.ts"

describe("parseTutorialProgressStore", () => {
  it("returns empty store for invalid input", () => {
    const store = parseTutorialProgressStore(null)
    assert.equal(store.schemaVersion, 1)
    assert.equal(store.dismissedFirstRun, false)
    assert.deepEqual(store.tutorials, {})
  })

  it("keeps valid tutorial entries", () => {
    const store = parseTutorialProgressStore({
      schemaVersion: 1,
      dismissedFirstRun: true,
      tutorials: {
        "tab-list-browse": { status: "completed", stepIndex: 0 }
      }
    })
    assert.equal(store.dismissedFirstRun, true)
    assert.equal(store.tutorials["tab-list-browse"]?.status, "completed")
  })
})

describe("shouldAutoStartDefaultTutorial", () => {
  it("starts when never dismissed", () => {
    assert.equal(
      shouldAutoStartDefaultTutorial({
        schemaVersion: 1,
        dismissedFirstRun: false,
        tutorials: {}
      }),
      true
    )
  })

  it("does not start after skip or complete", () => {
    const skipped = withTutorialSkipped(
      { schemaVersion: 1, dismissedFirstRun: false, tutorials: {} },
      "tab-list-browse"
    )
    assert.equal(shouldAutoStartDefaultTutorial(skipped), false)
    const completed = withTutorialCompleted(
      { schemaVersion: 1, dismissedFirstRun: false, tutorials: {} },
      "tab-list-browse"
    )
    assert.equal(shouldAutoStartDefaultTutorial(completed), false)
  })
})
