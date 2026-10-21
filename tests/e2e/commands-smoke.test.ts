/**
 * EN: Chromium extension — command smoke matrix (wiring / primary paths).
 * JA: Chromium 拡張 — コマンド・スモーク行列（配線・主要経路）。
 *
 * Ported from edit20261019 Playwright `tests/e2e/commands-smoke.spec.ts`.
 *
 * EN: One browser session per suite — Firefox Marionette wedges under per-test launch.
 * JA: スイートにつき1セッション。Firefox はテストごとの起動で Marionette が不安定になる。
 */

import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { By, until } from "selenium-webdriver"
import { COMMAND_SMOKE_CASES, type SmokeCase } from "./command-matrix.ts"
import {
  launchBmxtSession,
  openBmxtPage,
  resetShellBetweenTests,
  runPromptLine,
  seedHttpsTab,
  type BmxtSession
} from "./harness.ts"
import {
  expectLogContains,
  expectNoStderr,
  readOutLineTexts,
  readStderrLineTexts,
  waitForOutLine
} from "./helpers/log.ts"

async function assertSmoke(session: BmxtSession, smoke: SmokeCase): Promise<void> {
  const { driver } = session
  switch (smoke.assert) {
    case "usage": {
      await expectLogContains(driver, smoke.expectContains ?? "usage:")
      break
    }
    case "help_text": {
      await waitForOutLine(driver)
      await expectLogContains(driver, smoke.expectContains ?? "help")
      break
    }
    case "log_ok": {
      await waitForOutLine(driver)
      if (smoke.expectContains) {
        await expectLogContains(driver, smoke.expectContains)
      }
      // EN: Soft check — some help paths may still tag lines; fail only hard errors.
      const errTexts = await readStderrLineTexts(driver)
      const hard = errTexts.filter((t) => t.includes("error:"))
      assert.deepEqual(hard, [], `unexpected stderr: ${hard.join(" | ")}`)
      break
    }
    case "log_or_empty": {
      // EN: Empty list / no matches is OK; hard error: is not.
      const errTexts = await readStderrLineTexts(driver)
      const hard = errTexts.filter((t) => t.includes("error:"))
      assert.deepEqual(hard, [], `unexpected stderr: ${hard.join(" | ")}`)
      break
    }
    case "picker": {
      await driver.wait(
        until.elementLocated(By.css(".bmxt-tab-picker, .bmxt-side-picker")),
        30_000
      )
      break
    }
    case "cleared": {
      // EN: `clear` wipes prior log then appends a short done line (locale-stable marker).
      const texts = await readOutLineTexts(driver)
      assert.ok(texts.length <= 2, `expected ≤2 log lines after clear, got ${texts.length}`)
      const joined = texts.join("\n")
      assert.ok(
        joined.includes("log cleared") || joined.includes("クリア"),
        `clear marker missing in: ${joined}`
      )
      await expectNoStderr(driver)
      break
    }
    default: {
      const _exhaustive: never = smoke.assert
      throw new Error(`Unknown assert: ${_exhaustive}`)
    }
  }
}

describe("command smoke matrix", () => {
  let session: BmxtSession
  let seededHttps = false

  before(async () => {
    session = await launchBmxtSession()
    await openBmxtPage(session)
  })

  after(async () => {
    if (session) {
      await session.quit()
    }
  })

  for (const smoke of COMMAND_SMOKE_CASES) {
    const taggedSkip =
      smoke.tags?.includes("destructive") === true || smoke.tags?.includes("fsa") === true
    const skipReason = taggedSkip
      ? `tagged skip: ${(smoke.tags ?? []).join(",")}`
      : false

    it(`${smoke.id}: ${smoke.line}`, { skip: skipReason }, async () => {
      // EN: Isolate log/picker state without relaunching the browser.
      if (smoke.assert !== "cleared") {
        await resetShellBetweenTests(session.driver)
      } else {
        // EN: Seed a log line so clear has something to wipe (reset would clear first).
        await runPromptLine(session.driver, "help")
        await waitForOutLine(session.driver)
      }

      if (smoke.tags?.includes("needs_https") && !seededHttps) {
        await seedHttpsTab(session)
        seededHttps = true
      }

      await runPromptLine(session.driver, smoke.line)
      await assertSmoke(session, smoke)
    })
  }
})
