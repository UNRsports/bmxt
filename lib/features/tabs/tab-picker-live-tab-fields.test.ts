import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyTabPickerLiveFieldsFromChrome,
  clearTabPickerLiveFields,
  forgetTabPickerLiveFields,
  getTabPickerLiveTabFieldsRevision,
  resolveLiveTabTitle,
  subscribeTabPickerLiveTabFields
} from "./tab-picker-live-tab-fields.ts"

const COMMIT_WAIT_MS = 400

async function waitForLiveCommit(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, COMMIT_WAIT_MS))
}

describe("tab-picker-live-tab-fields", () => {
  it("resolveLiveTabTitle prefers committed live value over row fallback", async () => {
    clearTabPickerLiveFields()
    applyTabPickerLiveFieldsFromChrome(42, { title: "受信トレイ (2) - Gmail" })
    await waitForLiveCommit()
    assert.equal(resolveLiveTabTitle(42, "受信トレイ (1) - Gmail"), "受信トレイ (2) - Gmail")
  })

  it("pending churn does not change committed title until debounce settles", async () => {
    clearTabPickerLiveFields()
    applyTabPickerLiveFieldsFromChrome(7, { title: "newer" })
    await waitForLiveCommit()
    applyTabPickerLiveFieldsFromChrome(7, { title: "stale from query" })
    applyTabPickerLiveFieldsFromChrome(7, { title: "newer again" })
    assert.equal(resolveLiveTabTitle(7, "stale from query"), "newer")
    await waitForLiveCommit()
    assert.equal(resolveLiveTabTitle(7, "stale from query"), "newer again")
  })

  it("forget removes committed title", async () => {
    clearTabPickerLiveFields()
    applyTabPickerLiveFieldsFromChrome(9, { title: "gone" })
    await waitForLiveCommit()
    forgetTabPickerLiveFields(9)
    assert.equal(resolveLiveTabTitle(9, "fallback"), "fallback")
  })

  it("trailing debounce commits the last title after churn settles", async () => {
    clearTabPickerLiveFields()
    let revision = getTabPickerLiveTabFieldsRevision()
    subscribeTabPickerLiveTabFields(() => {
      revision = getTabPickerLiveTabFieldsRevision()
    })

    applyTabPickerLiveFieldsFromChrome(100, { title: "受信トレイ (1)" })
    applyTabPickerLiveFieldsFromChrome(100, { title: "受信トレイ" })
    applyTabPickerLiveFieldsFromChrome(100, { title: "受信トレイ (1)" })

    assert.equal(resolveLiveTabTitle(100, ""), "")

    await waitForLiveCommit()

    assert.equal(resolveLiveTabTitle(100, ""), "受信トレイ (1)")
    assert.ok(revision > 0)
  })
})
