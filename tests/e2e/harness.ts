/**
 * EN: Headless WebDriver harness — Chrome (ChromeDriver) + Firefox (geckodriver/Marionette).
 * JA: Headless WebDriver ハーネス — Chrome / Firefox 両対応。
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Builder, By, Key, until, type WebDriver, type WebElement } from "selenium-webdriver"
import chrome from "selenium-webdriver/chrome.js"
import firefox from "selenium-webdriver/firefox.js"
import { chromeExtensionIdFromPath } from "./chrome-extension-id.ts"
import { resolveFirefoxExtensionUuid } from "./resolve-firefox-extension-uuid.ts"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..")

/**
 * EN: Prefer repo-local profile dirs — CI/agent `/tmp` quotas break Chrome prefs writes.
 * JA: プロファイルはリポジトリ配下へ（`/tmp` のクォータで prefs 書き込みが落ちることがある）。
 */
function e2eProfileDir(prefix: string): string {
  const base = join(root, ".output", "e2e-profiles")
  mkdirSync(base, { recursive: true })
  return mkdtempSync(join(base, `${prefix}-`))
}

export type E2eBrowser = "chrome" | "firefox"

export type BmxtSession = {
  browser: E2eBrowser
  driver: WebDriver
  extensionOrigin: string
  userDataDir: string | null
  quit: () => Promise<void>
}

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

export function extensionOutputPath(browser: E2eBrowser): string {
  return join(root, ".output", browser === "firefox" ? "firefox-mv3" : "chrome-mv3")
}

export function readGeckoId(extensionPath: string): string {
  const raw = readFileSync(join(extensionPath, "manifest.json"), "utf8")
  const manifest = JSON.parse(raw) as {
    browser_specific_settings?: { gecko?: { id?: unknown } }
  }
  const id = manifest.browser_specific_settings?.gecko?.id
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(`Missing browser_specific_settings.gecko.id in ${extensionPath}`)
  }
  return id
}

function requireExtensionBuild(browser: E2eBrowser): string {
  const extensionPath = extensionOutputPath(browser)
  if (!existsSync(join(extensionPath, "manifest.json"))) {
    const script = browser === "firefox" ? "build:firefox" : "build:chrome"
    throw new Error(`Missing ${extensionPath}. Run \`pnpm run ${script}\` before e2e.`)
  }
  return extensionPath
}

/**
 * EN: Branded Chrome 137+ dropped `--load-extension`. Pin Chrome for Testing via Selenium Manager.
 * JA: ブランド版 Chrome 137+ は `--load-extension` 不可。Selenium Manager で Chrome for Testing を固定。
 * Override: `BMXT_E2E_CHROME_VERSION` (default keeps extensions + headless=new).
 */
const DEFAULT_CHROME_FOR_TESTING_VERSION = "141.0.7390.78"

async function launchChrome(extensionPath: string): Promise<BmxtSession> {
  // EN: Unique profile avoids "failed to write prefs file" when suites overlap.
  const userDataDir = e2eProfileDir("chrome")
  const options = new chrome.Options()
  const browserVersion =
    process.env.BMXT_E2E_CHROME_VERSION?.trim() || DEFAULT_CHROME_FOR_TESTING_VERSION
  options.setBrowserVersion(browserVersion)
  // EN: New headless supports extensions; Chrome for Testing keeps --load-extension.
  options.addArguments(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${userDataDir}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  )

  let driver: WebDriver
  try {
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build()
  } catch (err) {
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    throw err
  }
  const extensionId = chromeExtensionIdFromPath(extensionPath)
  const extensionOrigin = `chrome-extension://${extensionId}`

  return {
    browser: "chrome",
    driver,
    extensionOrigin,
    userDataDir,
    quit: async () => {
      try {
        await driver.quit()
      } catch {
        /* EN: Driver may already be dead. */
      }
      try {
        rmSync(userDataDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  }
}

async function launchFirefoxOnce(extensionPath: string): Promise<BmxtSession> {
  const userDataDir = e2eProfileDir("firefox")
  const options = new firefox.Options()
  options.addArguments("-headless")
  options.addArguments("-profile", userDataDir)
  options.setPreference("xpinstall.signatures.required", false)
  options.setPreference("extensions.autoDisableScopes", 0)
  options.setPreference("devtools.debugger.remote-enabled", true)

  // EN: Required to use Marionette chrome context (open moz-extension:// pages).
  const service = new firefox.ServiceBuilder().addArguments("--allow-system-access")

  let driver: firefox.Driver
  try {
    driver = (await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .setFirefoxService(service)
      .build()) as firefox.Driver
  } catch (err) {
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      /* EN: Best-effort profile cleanup after failed launch. */
    }
    throw err
  }

  try {
    await driver.installAddon(extensionPath, true)
    const geckoId = readGeckoId(extensionPath)
    const uuid = await resolveFirefoxExtensionUuid(userDataDir, geckoId, 60_000)
    const extensionOrigin = `moz-extension://${uuid}`

    return {
      browser: "firefox",
      driver,
      extensionOrigin,
      userDataDir,
      quit: async () => {
        try {
          await driver.quit()
        } catch {
          /* EN: Marionette may already be dead after a decode error. */
        }
        try {
          rmSync(userDataDir, { recursive: true, force: true })
        } catch {
          /* EN: Best-effort profile cleanup. */
        }
      }
    }
  } catch (err) {
    try {
      await driver.quit()
    } catch {
      /* ignore */
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    throw err
  }
}

/** EN: Retry Firefox launch — rapid create/destroy can wedge Marionette prefs. */
async function launchFirefox(extensionPath: string): Promise<BmxtSession> {
  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await launchFirefoxOnce(extensionPath)
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
    }
  }
  throw lastError
}

/**
 * EN: Marionette blocks `driver.get(moz-extension://…)`. Open via chrome-context trusted navigation.
 * JA: Marionette は `driver.get(moz-extension://…)` を拒否するため、chrome コンテキストで開く。
 */
async function openFirefoxExtensionPage(driver: WebDriver, url: string): Promise<void> {
  const fx = driver as firefox.Driver
  await fx.setContext(firefox.Context.CHROME)
  try {
    await fx.executeScript(
      `
      const pageUrl = arguments[0];
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (!win) {
        throw new Error("no navigator:browser window");
      }
      if (typeof win.openTrustedLinkIn === "function") {
        win.openTrustedLinkIn(pageUrl, "tab");
        return;
      }
      if (win.gBrowser && typeof win.gBrowser.addTrustedTab === "function") {
        win.gBrowser.addTrustedTab(pageUrl);
        return;
      }
      throw new Error("no trusted tab opener available");
      `,
      url
    )
  } finally {
    await fx.setContext(firefox.Context.CONTENT)
  }

  await driver.wait(async () => {
    for (const handle of await driver.getAllWindowHandles()) {
      await driver.switchTo().window(handle)
      const current = await driver.getCurrentUrl()
      if (current === url || current.startsWith(`${url}?`) || current.startsWith(`${url}#`)) {
        return true
      }
    }
    return false
  }, 60_000)
}

/** EN: Launch headless browser with the unpacked host build loaded. */
export async function launchBmxtSession(
  browser: E2eBrowser = resolveE2eBrowser()
): Promise<BmxtSession> {
  const extensionPath = requireExtensionBuild(browser)
  if (browser === "firefox") {
    return launchFirefox(extensionPath)
  }
  return launchChrome(extensionPath)
}

/**
 * EN: Skip first-run tutorial coach so it does not steal keys / assert noise.
 *     Returns false on storage/script failure (caller falls back to UI skip).
 * JA: 初回チュートリアルのコーチ UI を閉じる。storage 失敗時は false（UI skip にフォールバック）。
 */
async function dismissFirstRunTutorial(driver: WebDriver): Promise<boolean> {
  try {
    const result = await driver.executeAsyncScript(`
      const done = arguments[arguments.length - 1];
      const payload = {
        bmxt_tutorial_progress_v1: {
          schemaVersion: 1,
          dismissedFirstRun: true,
          tutorials: {
            "tab-list-browse": { status: "skipped", stepIndex: 0 }
          }
        }
      };
      chrome.storage.local
        .set(payload)
        .then(() => done(true))
        .catch((err) => {
          done({ __error: String(err && err.message ? err.message : err) });
        });
    `)
    if (result && typeof result === "object" && "__error" in (result as object)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function navigateToBmxtShell(session: BmxtSession, pageUrl: string): Promise<void> {
  if (session.browser === "firefox") {
    await openFirefoxExtensionPage(session.driver, pageUrl)
  } else {
    await session.driver.get(pageUrl)
  }
  await session.driver.wait(until.elementLocated(By.css(".bmxt-prompt-ime")), 60_000)
}

async function reloadBmxtShell(session: BmxtSession, pageUrl: string): Promise<void> {
  if (session.browser === "firefox") {
    // EN: `navigate().refresh()` is unreliable for moz-extension under Marionette.
    //     Close the current shell tab and open a fresh one via chrome-context.
    const previous = await session.driver.getWindowHandle()
    await openFirefoxExtensionPage(session.driver, pageUrl)
    const handles = await session.driver.getAllWindowHandles()
    for (const handle of handles) {
      if (handle === previous) {
        try {
          await session.driver.switchTo().window(handle)
          await session.driver.close()
        } catch {
          /* EN: Tab may already be gone. */
        }
        break
      }
    }
    await session.driver.wait(async () => {
      for (const handle of await session.driver.getAllWindowHandles()) {
        await session.driver.switchTo().window(handle)
        const current = await session.driver.getCurrentUrl()
        if (current === pageUrl || current.startsWith(`${pageUrl}?`) || current.startsWith(`${pageUrl}#`)) {
          return true
        }
      }
      return false
    }, 60_000)
  } else {
    await session.driver.navigate().refresh()
  }
  await session.driver.wait(until.elementLocated(By.css(".bmxt-prompt-ime")), 60_000)
}

async function clickTutorialSkipIfPresent(driver: WebDriver): Promise<void> {
  const skips = await driver.findElements(By.css(".bmxt-tutorial-coach-skip"))
  if (skips.length === 0) {
    return
  }
  await skips[0]!.click()
  await driver.wait(async () => {
    const coaches = await driver.findElements(By.css(".bmxt-tutorial-coach"))
    return coaches.length === 0
  }, 15_000)
}

export async function openBmxtPage(session: BmxtSession): Promise<void> {
  const pageUrl = `${session.extensionOrigin}/bmxt.html`
  await navigateToBmxtShell(session, pageUrl)
  // EN: First-run auto-start may race and overwrite storage; dismiss twice, then reload.
  await dismissFirstRunTutorial(session.driver)
  await new Promise((resolve) => setTimeout(resolve, 250))
  await dismissFirstRunTutorial(session.driver)
  try {
    await reloadBmxtShell(session, pageUrl)
  } catch {
    // EN: Marionette decode errors on reload — fall through to skip-button path.
    await navigateToBmxtShell(session, pageUrl)
  }
  await clickTutorialSkipIfPresent(session.driver)
  await session.driver.wait(async () => {
    const coaches = await session.driver.findElements(By.css(".bmxt-tutorial-coach"))
    return coaches.length === 0
  }, 30_000)
}

/**
 * EN: Between shared-session tests — dismiss pickers and wipe the log so asserts stay isolated.
 * JA: 共有セッションのテスト間で候補を閉じログをクリアし、アサートを隔離する。
 */
export async function resetShellBetweenTests(driver: WebDriver): Promise<void> {
  await dismissPromptPickers(driver)
  for (let i = 0; i < 4; i += 1) {
    const open = await driver.findElements(
      By.css(".bmxt-tab-picker, .bmxt-side-picker, .bmxt-subcmd-picker")
    )
    if (open.length === 0) {
      break
    }
    await pressPromptKey(driver, Key.ESCAPE)
  }
  await runPromptLine(driver, "clear")
  await waitPromptIdle(driver)
}

export async function promptIme(driver: WebDriver): Promise<WebElement> {
  return driver.findElement(By.css(".bmxt-prompt-ime"))
}

export async function focusPrompt(driver: WebDriver): Promise<WebElement> {
  const ime = await promptIme(driver)
  await ime.click()
  return ime
}

async function setPromptValueViaInputEvent(driver: WebDriver, ime: WebElement, value: string): Promise<void> {
  // EN: Ctrl/Meta+A is unreliable on the IME field under WebDriver; use the native value setter + input.
  await driver.executeScript(
    `
    const el = arguments[0];
    const next = arguments[1];
    const proto =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (!descriptor || typeof descriptor.set !== "function") {
      throw new Error("native value setter unavailable");
    }
    descriptor.set.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    `,
    ime,
    value
  )
}

export async function clearAndTypePrompt(driver: WebDriver, line: string): Promise<void> {
  const ime = await focusPrompt(driver)
  await setPromptValueViaInputEvent(driver, ime, "")
  // EN: Character-by-character sendKeys exercises React onInput (same intent as Playwright type()).
  for (const ch of line) {
    await ime.sendKeys(ch)
  }
  await driver.wait(async () => (await ime.getAttribute("value")) === line, 15_000)
}

export async function promptValue(driver: WebDriver): Promise<string> {
  const ime = await promptIme(driver)
  return (await ime.getAttribute("value")) ?? ""
}

export async function pressPromptKey(driver: WebDriver, key: string): Promise<void> {
  const ime = await promptIme(driver)
  await ime.sendKeys(key)
}

export async function mirrorText(driver: WebDriver): Promise<string> {
  const mirror = await driver.findElement(By.css(".bmxt-prompt-mirror"))
  return mirror.getText()
}

/** EN: Dismiss token / session candidate menus so Enter submits the line. */
export async function dismissPromptPickers(driver: WebDriver): Promise<void> {
  const ime = await promptIme(driver)
  for (let i = 0; i < 3; i += 1) {
    const open = await driver.findElements(
      By.css(".bmxt-subcmd-picker, .bmxt-session-candidate-panel, [id^='bmxt-session-candidate']")
    )
    if (open.length === 0) {
      break
    }
    await ime.sendKeys(Key.ESCAPE)
  }
}

/** EN: Replace the controlled prompt line (React onInput), matching Playwright setPromptLine. */
export async function setPromptLine(driver: WebDriver, line: string): Promise<void> {
  await focusPrompt(driver)
  await dismissPromptPickers(driver)
  await clearAndTypePrompt(driver, line)
}

/** EN: Wait until the prompt is not in the command-busy lock state. */
export async function waitPromptIdle(driver: WebDriver, timeoutMs = 60_000): Promise<void> {
  await driver.wait(async () => {
    const busy = await driver.findElements(By.css(".bmxt-prompt-line--busy"))
    if (busy.length > 0) {
      return false
    }
    const ime = await promptIme(driver)
    const className = (await ime.getAttribute("class")) ?? ""
    return !className.includes("bmxt-prompt-ime--busy-lock")
  }, timeoutMs)
}

/**
 * EN: Set line, dismiss pickers, press Enter, wait for busy to clear.
 * JA: 行をセットし候補を閉じてから Enter。busy 解除まで待つ。
 */
export async function runPromptLine(driver: WebDriver, line: string): Promise<void> {
  await setPromptLine(driver, line)
  await dismissPromptPickers(driver)
  await pressPromptKey(driver, Key.ENTER)
  await waitPromptIdle(driver)
}

/** EN: Move caret left `steps` times without asserting line identity. */
export async function moveCaretLeft(driver: WebDriver, steps: number): Promise<void> {
  for (let i = 0; i < steps; i += 1) {
    await pressPromptKey(driver, Key.ARROW_LEFT)
  }
}

/**
 * EN: Open an https page in the same browser session (content-script host).
 * JA: 同一ブラウザセッションで https ページを開く（CS 向け）。
 */
export async function seedHttpsTab(
  session: BmxtSession,
  url: string = "https://example.com/"
): Promise<void> {
  const bmxtHandle = await session.driver.getWindowHandle()
  await session.driver.switchTo().newWindow("tab")
  await session.driver.get(url)
  await session.driver.wait(async () => {
    const current = await session.driver.getCurrentUrl()
    return current.startsWith("http://") || current.startsWith("https://")
  }, 60_000)
  await session.driver.switchTo().window(bmxtHandle)
}
