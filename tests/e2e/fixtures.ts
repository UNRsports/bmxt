/**
 * EN: Playwright fixtures — load built MV3 extension in Chromium or Firefox.
 * JA: Playwright フィクスチャ — ビルド済み MV3 拡張を Chromium / Firefox にロード。
 *
 * Select host with `BMXT_E2E_BROWSER=chrome|firefox` (default: chrome).
 *
 * EN: Shell UI (`bmxtPage`) is Chromium-only. Playwright’s Firefox (Juggler) cannot
 * drive `moz-extension://` pages — see microsoft/playwright#7297.
 * JA: シェル UI（`bmxtPage`）は Chromium のみ。Playwright Firefox は
 * `moz-extension://` を操作できない（microsoft/playwright#7297）。
 */

import { test as base, chromium, firefox, type BrowserContext, type Page } from "@playwright/test"
import { existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { withExtension } from "playwright-webextext"
import { resolveFirefoxExtensionUuid } from "./resolve-firefox-extension-uuid.ts"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..")

export type E2eBrowser = "chrome" | "firefox"

/** EN: workers:1 only — profile path for Firefox UUID lookup in the same worker. */
let activeFirefoxUserDataDir: string | null = null

export function resolveE2eBrowser(): E2eBrowser {
  const raw = (process.env.BMXT_E2E_BROWSER ?? "chrome").trim().toLowerCase()
  if (raw === "firefox" || raw === "gecko") {
    return "firefox"
  }
  if (raw === "chrome" || raw === "chromium") {
    return "chrome"
  }
  throw new Error(
    `Unsupported BMXT_E2E_BROWSER=${JSON.stringify(process.env.BMXT_E2E_BROWSER)} (use chrome|firefox)`
  )
}

export function isFirefoxE2e(): boolean {
  return resolveE2eBrowser() === "firefox"
}

function extensionOutputPath(browser: E2eBrowser): string {
  return join(root, ".output", browser === "firefox" ? "firefox-mv3" : "chrome-mv3")
}

export function readGeckoId(extensionPath: string): string {
  const manifestPath = join(extensionPath, "manifest.json")
  const raw = readFileSync(manifestPath, "utf8")
  const manifest = JSON.parse(raw) as {
    browser_specific_settings?: { gecko?: { id?: unknown } }
  }
  const id = manifest.browser_specific_settings?.gecko?.id
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(
      `Firefox build at ${extensionPath} is missing browser_specific_settings.gecko.id`
    )
  }
  return id
}

export function firefoxExtensionPath(): string {
  return extensionOutputPath("firefox")
}

export type ExtensionFixtures = {
  context: BrowserContext
  /** EN: Chrome extension id host, or Firefox moz-extension UUID. */
  extensionId: string
  extensionOrigin: string
  /** EN: Chromium only — opens `bmxt.html` in the extension origin. */
  bmxtPage: Page
  firefoxUserDataDir: string | null
}

async function launchChromeContext(extensionPath: string): Promise<BrowserContext> {
  const userDataDir = mkdtempSync(join(tmpdir(), "bmxt-e2e-chrome-"))
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
      "--disable-dev-shm-usage"
    ]
  })
}

async function launchFirefoxContext(extensionPath: string): Promise<BrowserContext> {
  const userDataDir = mkdtempSync(join(tmpdir(), "bmxt-e2e-firefox-"))
  activeFirefoxUserDataDir = userDataDir
  const browserType = withExtension(firefox, extensionPath)
  return browserType.launchPersistentContext(userDataDir, {
    headless: false,
    firefoxUserPrefs: {
      "xpinstall.signatures.required": false,
      "extensions.autoDisableScopes": 0,
      "devtools.chrome.enabled": true,
      "devtools.debugger.remote-enabled": true
    }
  })
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const browser = resolveE2eBrowser()
    const extensionPath = extensionOutputPath(browser)
    if (!existsSync(extensionPath)) {
      const buildScript = browser === "firefox" ? "build:firefox" : "build:chrome"
      throw new Error(
        `Missing extension build at ${extensionPath}. Run \`pnpm run ${buildScript}\` before e2e.`
      )
    }
    activeFirefoxUserDataDir = null
    const context =
      browser === "firefox"
        ? await launchFirefoxContext(extensionPath)
        : await launchChromeContext(extensionPath)
    try {
      await use(context)
    } finally {
      activeFirefoxUserDataDir = null
      await context.close()
    }
  },

  firefoxUserDataDir: async ({}, use) => {
    await use(activeFirefoxUserDataDir)
  },

  extensionId: async ({ context }, use) => {
    const browser = resolveE2eBrowser()
    if (browser === "chrome") {
      let [worker] = context.serviceWorkers()
      if (!worker) {
        worker = await context.waitForEvent("serviceworker", { timeout: 60_000 })
      }
      await use(new URL(worker.url()).host)
      return
    }

    const extensionPath = extensionOutputPath("firefox")
    const geckoId = readGeckoId(extensionPath)
    const userDataDir = activeFirefoxUserDataDir
    if (userDataDir === null) {
      throw new Error("Firefox e2e: persistent profile directory was not recorded")
    }
    const uuid = await resolveFirefoxExtensionUuid(userDataDir, geckoId)
    await use(uuid)
  },

  extensionOrigin: async ({ extensionId }, use) => {
    const browser = resolveE2eBrowser()
    const origin =
      browser === "firefox"
        ? `moz-extension://${extensionId}`
        : `chrome-extension://${extensionId}`
    await use(origin)
  },

  bmxtPage: async ({ context, extensionOrigin }, use) => {
    if (resolveE2eBrowser() === "firefox") {
      throw new Error(
        "bmxtPage is Chromium-only: Playwright Firefox (Juggler) cannot drive moz-extension:// pages (playwright#7297)."
      )
    }
    const page = await context.newPage()
    await page.goto(`${extensionOrigin}/bmxt.html`, {
      waitUntil: "domcontentloaded"
    })
    await page.waitForSelector(".bmxt-prompt-ime", { timeout: 60_000 })
    await use(page)
  }
})

export const expect = test.expect
