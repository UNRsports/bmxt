/**
 * EN: Pure previous-step rules for the sync wizard Back button.
 * JA: sync ウィザード「戻る」の直前ステップ判定（純関数）。
 */

import type { SyncWizardState, SyncWizardStep } from "./sync-wizard-state.ts"

/**
 * EN: Whether the wizard can move to a previous choice step.
 * JA: 直前の選択肢ステップへ戻れるか。
 */
export function wizardCanGoBack(state: SyncWizardState): boolean {
  if (!state.open || state.busy) {
    return false
  }
  if (state.step === "family") {
    return false
  }
  if (state.mode === "connect") {
    // EN: Connect opens on offer/answer exchange; only showAnswer has a prior choice in-wizard.
    return state.step === "showAnswer"
  }
  return true
}

/**
 * EN: Step to restore when Back is pressed, or null if Back is not available.
 * JA: 「戻る」で復元するステップ。戻れない場合は null。
 */
export function wizardPreviousStep(state: SyncWizardState): SyncWizardStep | null {
  if (!wizardCanGoBack(state)) {
    return null
  }

  if (state.mode === "connect") {
    if (state.step === "showAnswer") {
      return "pasteOffer"
    }
    return null
  }

  if (
    state.step === "joinInvite" ||
    state.step === "showInvite" ||
    state.step === "role" ||
    state.step === "done"
  ) {
    return "family"
  }

  if (state.step === "showOffer" || state.step === "pasteOffer") {
    return "role"
  }

  if (state.step === "showAnswer") {
    return "pasteOffer"
  }

  return null
}

/** EN: Steps whose outbound/pending handshake should be cleared when leaving via Back. */
export function wizardBackClearsPending(step: SyncWizardStep): boolean {
  return (
    step === "showInvite" ||
    step === "showOffer" ||
    step === "pasteOffer" ||
    step === "showAnswer" ||
    step === "done"
  )
}
