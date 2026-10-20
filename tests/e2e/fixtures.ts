/**
 * EN: Playwright fixtures — load built MV3 extension in Chromium.
 * JA: Playwright フィクスチャ — ビルド済み MV3 拡張を Chromium にロード。
 */

import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test"
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { extensionPageUrl } from "../../lib/features/extension-url/extension-page-url.ts"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..")
const extensionPath = join(root, ".output", "chrome-mv3")

/**
 * EN: Default headless so e2e does not steal the desktop. Opt into a visible
 *     window with `HEADED=1` or `pnpm run test:e2e:headed`.
 * JA: 既定は headless（デスクトップを占有しない）。可視化は `HEADED=1` /
 *     `pnpm run test:e2e:headed`。
 *
 * EN: `channel: "chromium"` is required for MV3 extensions under headless
 *     (Playwright docs — not the headless shell).
 */
function e2eHeadless(): boolean {
  if (process.env.HEADED === "1" || process.env.HEADED === "true") {
    return false
  }
  if (process.env.HEADLESS === "0" || process.env.HEADLESS === "false") {
    return false
  }
  return true
}

export type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  bmxtPage: Page
}

export const test = base.extend<ExtensionFixtures>({
  // EN: Replace default context — extensions require launchPersistentContext.
  context: async ({}, use) => {
    if (!existsSync(extensionPath)) {
      throw new Error(
        `Missing extension build at ${extensionPath}. Run \`pnpm run build\` before \`pnpm run test:e2e\`.`
      )
    }
    const userDataDir = mkdtempSync(join(tmpdir(), "bmxt-e2e-"))
    const context = await chromium.launchPersistentContext(userDataDir, {
      // EN: Full Chromium build — required for --load-extension in headless.
      channel: "chromium",
      headless: e2eHeadless(),
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-sandbox",
        "--disable-dev-shm-usage"
      ]
    })
    await use(context)
    await context.close()
  },

  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) {
      worker = await context.waitForEvent("serviceworker", { timeout: 60_000 })
    }
    const extensionId = new URL(worker.url()).host
    await use(extensionId)
  },

  bmxtPage: async ({ context, extensionId }, use) => {
    // EN: Skip first-run tutorial so coach overlay does not steal keys / assert noise.
    let [worker] = context.serviceWorkers()
    if (!worker) {
      worker = await context.waitForEvent("serviceworker", { timeout: 60_000 })
    }
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        bmxt_tutorial_progress_v1: {
          schemaVersion: 1,
          dismissedFirstRun: true,
          tutorials: {
            "tab-list-browse": { status: "skipped", stepIndex: 0 }
          }
        }
      })
    })
    const page = await context.newPage()
    // EN: Protocol via helper (not hard-coded chrome-extension://) — FF E2E can pass moz.
    await page.goto(extensionPageUrl({ extensionId, path: "shell" }), {
      waitUntil: "domcontentloaded"
    })
    await page.waitForSelector(".bmxt-prompt-ime", { timeout: 60_000 })
    await test.expect(page.locator(".bmxt-tutorial-coach")).toHaveCount(0)
    await use(page)
  }
})

export const expect = test.expect
