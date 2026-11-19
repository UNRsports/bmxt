import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  closeSyncWizardState,
  getSyncWizardState,
  isSyncWizardOpen,
  setSyncWizardBanner,
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
      bannerKind: "info",
      busy: false,
      handshakeTransport: null
    })
    assert.equal(isSyncWizardOpen(), true)
    assert.equal(getSyncWizardState().step, "family")
    assert.equal(ticks, 1)
    closeSyncWizardState()
    assert.equal(isSyncWizardOpen(), false)
    assert.equal(ticks, 2)
    unsub()
  })

  it("setSyncWizardBanner sets warning tone and clears it", () => {
    closeSyncWizardState()
    setSyncWizardState({
      open: true,
      mode: "setup",
      step: "joinInvite",
      hasFamily: false,
      peerDisplayName: null,
      peerDeviceId: null,
      banner: null,
      bannerKind: "info",
      busy: false,
      handshakeTransport: "clipboard"
    })
    setSyncWizardBanner("bad token", "warning")
    assert.equal(getSyncWizardState().banner, "bad token")
    assert.equal(getSyncWizardState().bannerKind, "warning")
    setSyncWizardBanner(null)
    assert.equal(getSyncWizardState().banner, null)
    assert.equal(getSyncWizardState().bannerKind, "info")
    closeSyncWizardState()
  })
})
