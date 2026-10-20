/**
 * EN: Prompt E2E — CJK caret motion must not wipe the controlled prompt line.
 * JA: プロンプト E2E — CJK 上のキャレット移動で制御付きプロンプト行が消えないこと。
 *
 * Runs headless on Chrome and Firefox via WebDriver (`BMXT_E2E_BROWSER`).
 */

import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { Key } from "selenium-webdriver"
import {
  clearAndTypePrompt,
  launchBmxtSession,
  mirrorText,
  pressPromptKey,
  promptValue,
  openBmxtPage,
  type BmxtSession
} from "./harness.ts"

const CJK_COMMAND = "search -list --all リスト | browse"
const ASCII_COMMAND = "search -list --all test | browse"

describe("prompt CJK caret stability", () => {
  let session: BmxtSession

  before(async () => {
    session = await launchBmxtSession()
    await openBmxtPage(session)
  })

  after(async () => {
    if (session) {
      await session.quit()
    }
  })

  it("ArrowLeft through リスト keeps the full command line", async () => {
    const { driver } = session
    await clearAndTypePrompt(driver, CJK_COMMAND)
    const steps = CJK_COMMAND.length - CJK_COMMAND.indexOf("リ")
    for (let i = 0; i < steps + 2; i += 1) {
      await pressPromptKey(driver, Key.ARROW_LEFT)
      const value = await promptValue(driver)
      assert.equal(value, CJK_COMMAND, `after ${i + 1} ArrowLeft`)
    }
    const mirror = await mirrorText(driver)
    assert.match(mirror, /リスト/)
  })

  it("Delete inside リスト removes one character, not the whole line", async () => {
    const { driver } = session
    await clearAndTypePrompt(driver, CJK_COMMAND)
    const fromEnd = CJK_COMMAND.length - CJK_COMMAND.indexOf("リ")
    for (let i = 0; i < fromEnd; i += 1) {
      await pressPromptKey(driver, Key.ARROW_LEFT)
    }
    await pressPromptKey(driver, Key.DELETE)
    const value = await promptValue(driver)
    assert.equal(value.includes("search -list --all"), true)
    assert.equal(value.includes("| browse"), true)
    assert.notEqual(value, "")
    assert.equal(value.length, CJK_COMMAND.length - 1)
  })

  it("ASCII pattern line still allows free caret motion", async () => {
    const { driver } = session
    await clearAndTypePrompt(driver, ASCII_COMMAND)
    for (let i = 0; i < 8; i += 1) {
      await pressPromptKey(driver, Key.ARROW_LEFT)
      assert.equal(await promptValue(driver), ASCII_COMMAND)
    }
  })
})
