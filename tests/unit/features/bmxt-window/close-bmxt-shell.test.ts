import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { closeBmxtShellIfRequested } from "../../../../shared/lib/features/bmxt-window/close-bmxt-shell.ts"

describe("closeBmxtShellIfRequested", () => {
  it("does not throw when closeWindow is omitted or false", () => {
    closeBmxtShellIfRequested(undefined)
    closeBmxtShellIfRequested(false)
  })

  it("calls window.close when closeWindow is true", () => {
    let closed = 0
    const previous = globalThis.window
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        close: () => {
          closed += 1
        }
      }
    })
    try {
      closeBmxtShellIfRequested(true)
      assert.equal(closed, 1)
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previous
      })
    }
  })
})
