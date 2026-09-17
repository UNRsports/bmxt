/**
 * EN: Playwright fixtures — load built MV3 extension in Chromium.
 * JA: Playwright フィクスチャ — ビルド済み MV3 拡張を Chromium にロード。
 */

import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test"
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..")
const extensionPath = join(root, ".output", "chrome-mv3")

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
      headless: false,
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
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/bmxt.html`, {
      waitUntil: "domcontentloaded"
    })
    await page.waitForSelector(".bmxt-prompt-ime", { timeout: 60_000 })
    await use(page)
  }
})

export const expect = test.expect
