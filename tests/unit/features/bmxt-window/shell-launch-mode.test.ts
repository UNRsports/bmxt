import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"
import { usesTabShell } from "../../../../shared/lib/features/bmxt-window/shell-launch-mode.ts"

describe("usesTabShell", () => {
  const previousChrome = (globalThis as { chrome?: unknown }).chrome
  const previousNavigator = globalThis.navigator

  afterEach(() => {
    if (previousChrome === undefined) {
      delete (globalThis as { chrome?: unknown }).chrome
    } else {
      ;(globalThis as { chrome?: unknown }).chrome = previousChrome
    }
    Object.defineProperty(globalThis, "navigator", {
      value: previousNavigator,
      configurable: true,
      writable: true
    })
  })

  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" },
      configurable: true,
      writable: true
    })
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

  it("is false for Firefox PC (moz-extension, desktop UA)", () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `moz-extension://uuid${path === "/" ? "/" : path}`
      }
    }
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0" },
      configurable: true,
      writable: true
    })
    assert.equal(usesTabShell(), false)
  })

  it("is true for Firefox SP (moz-extension, Android UA)", () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `moz-extension://uuid${path === "/" ? "/" : path}`
      }
    }
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (Android 14; Mobile; rv:142.0) Gecko/142.0 Firefox/142.0"
      },
      configurable: true,
      writable: true
    })
    assert.equal(usesTabShell(), true)
  })
})
