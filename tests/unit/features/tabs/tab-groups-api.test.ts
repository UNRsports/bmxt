import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"
import {
  hasTabGroupsApi,
  queryTabGroups,
  TAB_GROUP_ID_NONE
} from "../../../../shared/lib/features/tabs/tab-groups-api.ts"

describe("tab-groups-api", () => {
  const previousChrome = (globalThis as { chrome?: unknown }).chrome

  afterEach(() => {
    if (previousChrome === undefined) {
      delete (globalThis as { chrome?: unknown }).chrome
    } else {
      ;(globalThis as { chrome?: unknown }).chrome = previousChrome
    }
  })

  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it("exports Chrome-compatible TAB_GROUP_ID_NONE", () => {
    assert.equal(TAB_GROUP_ID_NONE, -1)
  })

  it("reports missing API on Android-like hosts", () => {
    ;(globalThis as { chrome: unknown }).chrome = { runtime: {} }
    assert.equal(hasTabGroupsApi(), false)
  })

  it("queryTabGroups returns [] when API is missing", async () => {
    ;(globalThis as { chrome: unknown }).chrome = { runtime: {} }
    assert.deepEqual(await queryTabGroups({}), [])
  })
})
