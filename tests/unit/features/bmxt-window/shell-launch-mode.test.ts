import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"
import { usesTabShell } from "../../../../shared/lib/features/bmxt-window/shell-launch-mode.ts"

describe("usesTabShell", () => {
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

  it("is false when chrome.runtime is missing", () => {
    assert.equal(usesTabShell(), false)
  })

  it("is false for chrome-extension origins", () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://abc${path === "/" ? "/" : path}`
      }
    }
    assert.equal(usesTabShell(), false)
  })

  it("is true for moz-extension origins", () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `moz-extension://uuid${path === "/" ? "/" : path}`
      }
    }
    assert.equal(usesTabShell(), true)
  })
})
