import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  closeSyncWizardState,
  getSyncWizardState,
  isSyncWizardOpen,
  setSyncWizardState,
  subscribeSyncWizard
} from "../../../../shared/lib/features/sync/wizard/sync-wizard-state.ts"

describe("sync-wizard-state", () => {
  it("opens, notifies subscribers, and closes", () => {
    closeSyncWizardState()
    let ticks = 0
    const unsub = subscribeSyncWizard(() => {
      ticks += 1
    })
    assert.equal(isSyncWizardOpen(), false)
    setSyncWizardState({
      open: true,
      mode: "setup",
      step: "family",
      hasFamily: false,
      peerDisplayName: null,
      peerDeviceId: null,
      banner: null,
      busy: false
    })
    assert.equal(isSyncWizardOpen(), true)
    assert.equal(getSyncWizardState().step, "family")
    assert.equal(ticks, 1)
    closeSyncWizardState()
    assert.equal(isSyncWizardOpen(), false)
    assert.equal(ticks, 2)
    unsub()
  })
})
