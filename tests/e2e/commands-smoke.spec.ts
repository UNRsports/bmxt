/**
 * EN: Chromium extension — command smoke matrix (wiring / primary paths).
 * JA: Chromium 拡張 — コマンド・スモーク行列（配線・主要経路）。
 */

import { COMMAND_SMOKE_CASES, type SmokeCase } from "./command-matrix.ts"
import { expect, test } from "./fixtures.ts"
import { expectLogContains, expectNoStderr, outLines, stderrLines } from "./helpers/log.ts"
import { runPromptLine } from "./helpers/prompt.ts"
import { seedHttpsTab } from "./helpers/seed.ts"

async function prepareCase(
  context: import("@playwright/test").BrowserContext,
  smoke: SmokeCase
): Promise<void> {
  if (smoke.tags?.includes("needs_https")) {
    await seedHttpsTab(context)
  }
}

async function assertSmoke(
  page: import("@playwright/test").Page,
  smoke: SmokeCase
): Promise<void> {
  switch (smoke.assert) {
    case "usage": {
      await expectLogContains(page, smoke.expectContains ?? "usage:")
      break
    }
    case "help_text": {
      await expect(outLines(page).first()).toBeVisible({ timeout: 15_000 })
      await expectLogContains(page, smoke.expectContains ?? "help")
      break
    }
    case "log_ok": {
      await expect(outLines(page).first()).toBeVisible({ timeout: 15_000 })
      if (smoke.expectContains) {
        await expectLogContains(page, smoke.expectContains)
      }
      // EN: Soft check — some help paths may still tag lines; fail only hard errors.
      const errTexts = await stderrLines(page).allTextContents()
      const hard = errTexts.filter((t) => t.includes("error:"))
      expect(hard, `unexpected stderr: ${hard.join(" | ")}`).toEqual([])
      break
    }
    case "log_or_empty": {
      // EN: Empty list / no matches is OK; hard error: is not.
      const errTexts = await stderrLines(page).allTextContents()
      const hard = errTexts.filter((t) => t.includes("error:"))
      expect(hard, `unexpected stderr: ${hard.join(" | ")}`).toEqual([])
      break
    }
    case "picker": {
      await expect(page.locator(".bmxt-tab-picker, .bmxt-side-picker").first()).toBeVisible({
        timeout: 30_000
      })
      break
    }
    case "cleared": {
      // EN: `clear` wipes prior log then appends a short done line (locale-stable marker).
      const texts = await outLines(page).allTextContents()
      expect(texts.length).toBeLessThanOrEqual(2)
      const joined = texts.join("\n")
      expect(
        joined.includes("log cleared") || joined.includes("クリア")
      ).toBe(true)
      await expectNoStderr(page)
      break
    }
    default: {
      const _exhaustive: never = smoke.assert
      throw new Error(`Unknown assert: ${_exhaustive}`)
    }
  }
}

test.describe("command smoke matrix", () => {
  for (const smoke of COMMAND_SMOKE_CASES) {
    test(`${smoke.id}: ${smoke.line}`, async ({ context, bmxtPage }) => {
      if (smoke.tags?.includes("destructive") || smoke.tags?.includes("fsa")) {
        test.skip(true, `tagged skip: ${(smoke.tags ?? []).join(",")}`)
      }
      await prepareCase(context, smoke)

      if (smoke.assert === "cleared") {
        // EN: Seed a log line so clear has something to wipe.
        await runPromptLine(bmxtPage, "help")
        await expect(outLines(bmxtPage).first()).toBeVisible()
      }

      await runPromptLine(bmxtPage, smoke.line)
      await assertSmoke(bmxtPage, smoke)
    })
  }
})
