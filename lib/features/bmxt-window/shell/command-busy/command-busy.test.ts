import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  COMMAND_BUSY_DELAY_MS,
  COMMAND_BUSY_FRAME_MS,
  COMMAND_BUSY_FRAMES,
  clampBusyRatio,
  commandBusyFrameAt,
  formatCommandBusyBar,
  formatCommandBusyFraction,
  formatCommandBusyLabel,
  shouldShowCommandBusy
} from "./command-busy.ts"

describe("command-busy", () => {
  it("cycles braille frames by elapsed time", () => {
    assert.equal(commandBusyFrameAt(0), COMMAND_BUSY_FRAMES[0])
    assert.equal(commandBusyFrameAt(COMMAND_BUSY_FRAME_MS), COMMAND_BUSY_FRAMES[1])
    assert.equal(
      commandBusyFrameAt(COMMAND_BUSY_FRAME_MS * COMMAND_BUSY_FRAMES.length),
      COMMAND_BUSY_FRAMES[0]
    )
  })

  it("formats npm-style busy label", () => {
    assert.equal(formatCommandBusyLabel(0, "Searching…"), `${COMMAND_BUSY_FRAMES[0]} Searching…`)
    assert.equal(formatCommandBusyLabel(0, "  "), COMMAND_BUSY_FRAMES[0])
  })

  it("appends standard fraction progress bar", () => {
    const label = formatCommandBusyLabel(
      0,
      "Searching…",
      { kind: "fraction", current: 2, total: 4, detail: "bookmarks" },
      true
    )
    assert.match(label, /^⠋ Searching… {2}\[[█░]+\] 2\/4 · bookmarks$/)
  })

  it("appends nested sub-progress", () => {
    const label = formatCommandBusyLabel(
      0,
      "Searching…",
      { kind: "fraction", current: 3, total: 4, subCurrent: 12, subTotal: 40 },
      false
    )
    assert.match(label, /3\/4 · 12\/40/)
  })

  it("clamps bar ratio and fraction", () => {
    assert.equal(clampBusyRatio(-1, 10), 0)
    assert.equal(clampBusyRatio(5, 10), 0.5)
    assert.equal(clampBusyRatio(99, 10), 1)
    assert.equal(formatCommandBusyFraction(2.9, 4), "2/4")
    assert.equal(formatCommandBusyBar(0, 4, 4), "[░░░░]")
    assert.equal(formatCommandBusyBar(4, 4, 4), "[████]")
  })

  it("hides indicator until the delay elapses", () => {
    assert.equal(shouldShowCommandBusy(0), false)
    assert.equal(shouldShowCommandBusy(COMMAND_BUSY_DELAY_MS - 1), false)
    assert.equal(shouldShowCommandBusy(COMMAND_BUSY_DELAY_MS), true)
  })
})
