import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  evaluateTutorialAssert,
  resolveSatisfiedStepIndex
} from "../../../../shared/lib/features/tutorial/assert.ts"
import { TAB_LIST_BROWSE_TUTORIAL } from "../../../../shared/lib/features/tutorial/tutorials/tab-list-browse.ts"
import type { TutorialObservation } from "../../../../shared/lib/features/tutorial/types.ts"

function obs(partial: Partial<TutorialObservation>): TutorialObservation {
  return {
    promptLine: "",
    tokenPicker: { visible: false, tier: null, candidates: [] },
    tabsPickerOpen: false,
    ...partial
  }
}

describe("evaluateTutorialAssert", () => {
  it("matches prompt token prefix", () => {
    assert.equal(
      evaluateTutorialAssert(
        { kind: "promptTokenPrefix", tokens: ["tab", "-list"] },
        obs({ promptLine: "tab -list |" })
      ),
      true
    )
    assert.equal(
      evaluateTutorialAssert(
        { kind: "promptTokenPrefix", tokens: ["tab", "-list", "|"] },
        obs({ promptLine: "tab -list" })
      ),
      false
    )
  })

  it("requires token picker visibility and candidate", () => {
    assert.equal(
      evaluateTutorialAssert(
        {
          kind: "all",
          of: [
            { kind: "promptMatches", pattern: "^tab$" },
            { kind: "tokenPickerVisible", tier: "second" },
            { kind: "tokenPickerHas", token: "-list" }
          ]
        },
        obs({
          promptLine: "tab",
          tokenPicker: {
            visible: true,
            tier: "second",
            candidates: ["-list", "-nowurl"]
          }
        })
      ),
      true
    )
  })
})

describe("tab-list-browse soft advancement", () => {
  it("stays on step 0 until tab + picker or -list prefix", () => {
    assert.equal(
      resolveSatisfiedStepIndex(TAB_LIST_BROWSE_TUTORIAL.steps, obs({ promptLine: "" })),
      0
    )
    assert.equal(
      resolveSatisfiedStepIndex(
        TAB_LIST_BROWSE_TUTORIAL.steps,
        obs({
          promptLine: "tab",
          tokenPicker: {
            visible: true,
            tier: "second",
            candidates: ["-list"]
          }
        })
      ),
      1
    )
  })

  it("advances through the full line before picker open", () => {
    assert.equal(
      resolveSatisfiedStepIndex(
        TAB_LIST_BROWSE_TUTORIAL.steps,
        obs({ promptLine: "tab -list | browse" })
      ),
      4
    )
    assert.equal(
      resolveSatisfiedStepIndex(
        TAB_LIST_BROWSE_TUTORIAL.steps,
        obs({ promptLine: "tab -list | browse", tabsPickerOpen: true })
      ),
      5
    )
  })
})
