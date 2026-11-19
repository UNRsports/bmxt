import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  wizardCanGoBack,
  wizardPreviousStep
} from "../../../../shared/lib/features/sync/wizard/sync-wizard-nav.ts"
import type { SyncWizardState } from "../../../../shared/lib/features/sync/wizard/sync-wizard-state.ts"

function baseState(partial: Partial<SyncWizardState>): SyncWizardState {
  return {
    open: true,
    mode: "setup",
    step: "family",
    hasFamily: false,
    peerDisplayName: null,
    peerDeviceId: null,
    banner: null,
    bannerKind: "info",
    busy: false,
    handshakeTransport: null,
    ...partial
  }
}

describe("sync wizard back navigation", () => {
  it("disallows back on family and when busy", () => {
    assert.equal(wizardCanGoBack(baseState({ step: "family" })), false)
    assert.equal(wizardCanGoBack(baseState({ step: "role", busy: true })), false)
    assert.equal(wizardPreviousStep(baseState({ step: "family" })), null)
  })

  it("setup: invite/role/done return to family", () => {
    assert.equal(wizardPreviousStep(baseState({ step: "joinInvite" })), "family")
    assert.equal(wizardPreviousStep(baseState({ step: "showInvite", hasFamily: true })), "family")
    assert.equal(wizardPreviousStep(baseState({ step: "role", hasFamily: true })), "family")
    assert.equal(wizardPreviousStep(baseState({ step: "done", hasFamily: true })), "family")
  })

  it("setup: offer/answer exchange returns to role; showAnswer to pasteOffer", () => {
    assert.equal(wizardPreviousStep(baseState({ step: "showOffer", hasFamily: true })), "role")
    assert.equal(wizardPreviousStep(baseState({ step: "pasteOffer", hasFamily: true })), "role")
    assert.equal(
      wizardPreviousStep(baseState({ step: "showAnswer", hasFamily: true })),
      "pasteOffer"
    )
  })

  it("connect: only showAnswer can go back to pasteOffer", () => {
    assert.equal(
      wizardCanGoBack(baseState({ mode: "connect", step: "showOffer", hasFamily: true })),
      false
    )
    assert.equal(
      wizardCanGoBack(baseState({ mode: "connect", step: "pasteOffer", hasFamily: true })),
      false
    )
    assert.equal(
      wizardPreviousStep(
        baseState({
          mode: "connect",
          step: "showAnswer",
          hasFamily: true,
          peerDisplayName: "Peer"
        })
      ),
      "pasteOffer"
    )
  })
})
