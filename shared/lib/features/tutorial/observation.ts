import type { ImeTokenTier } from "../command-line/ime-token-picker"
import type { TutorialObservation } from "./types"

export type TokenPickerObservationInput = {
  tier: ImeTokenTier
  candidates: readonly string[]
} | null

export function buildTutorialObservation(input: {
  promptLine: string
  tokenPicker: TokenPickerObservationInput
  tabsPickerOpen: boolean
}): TutorialObservation {
  if (input.tokenPicker === null) {
    return {
      promptLine: input.promptLine,
      tokenPicker: {
        visible: false,
        tier: null,
        candidates: []
      },
      tabsPickerOpen: input.tabsPickerOpen
    }
  }
  return {
    promptLine: input.promptLine,
    tokenPicker: {
      visible: true,
      tier: input.tokenPicker.tier,
      candidates: input.tokenPicker.candidates
    },
    tabsPickerOpen: input.tabsPickerOpen
  }
}
