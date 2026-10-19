import type { TutorialAssert, TutorialObservation } from "./types.ts"

function normalizePrompt(line: string): string {
  return line.replace(/\u00a0/g, " ").trimEnd()
}

function promptTokens(line: string): string[] {
  const normalized = normalizePrompt(line).trim()
  if (normalized.length === 0) {
    return []
  }
  return normalized.split(/\s+/).filter((t) => t.length > 0)
}

function evaluateOne(assert: TutorialAssert, obs: TutorialObservation): boolean {
  switch (assert.kind) {
    case "promptEquals": {
      return normalizePrompt(obs.promptLine) === assert.value
    }
    case "promptMatches": {
      const re = new RegExp(assert.pattern)
      return re.test(normalizePrompt(obs.promptLine))
    }
    case "promptTokenPrefix": {
      const tokens = promptTokens(obs.promptLine)
      if (tokens.length < assert.tokens.length) {
        return false
      }
      for (let i = 0; i < assert.tokens.length; i++) {
        if (tokens[i] !== assert.tokens[i]) {
          return false
        }
      }
      return true
    }
    case "tokenPickerVisible": {
      if (!obs.tokenPicker.visible) {
        return false
      }
      if (assert.tier !== undefined && obs.tokenPicker.tier !== assert.tier) {
        return false
      }
      return true
    }
    case "tokenPickerHas": {
      if (!obs.tokenPicker.visible) {
        return false
      }
      return obs.tokenPicker.candidates.includes(assert.token)
    }
    case "tabsPickerOpen": {
      return obs.tabsPickerOpen
    }
    case "all": {
      for (const child of assert.of) {
        if (!evaluateOne(child, obs)) {
          return false
        }
      }
      return true
    }
    case "any": {
      for (const child of assert.of) {
        if (evaluateOne(child, obs)) {
          return true
        }
      }
      return false
    }
    default: {
      const _exhaustive: never = assert
      return _exhaustive
    }
  }
}

export function evaluateTutorialAssert(
  assert: TutorialAssert,
  obs: TutorialObservation
): boolean {
  return evaluateOne(assert, obs)
}

/**
 * EN: Soft advancement — largest step index such that every prior step is satisfied.
 *     Returns `steps.length` when the tutorial is fully complete.
 */
export function resolveSatisfiedStepIndex(
  steps: readonly { assert: TutorialAssert }[],
  obs: TutorialObservation
): number {
  let index = 0
  while (index < steps.length && evaluateTutorialAssert(steps[index]!.assert, obs)) {
    index += 1
  }
  return index
}
