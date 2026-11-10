/**
 * EN: BMXt E2E harness — product UI helpers on top of webXdriver lifecycle.
 * JA: BMXt E2E ハーネス — webXdriver ライフサイクル上の製品 UI ヘルパー。
 */

import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { By, Key, until, type WebDriver, type WebElement } from "selenium-webdriver"
import {
  launchExtensionSession,
  openExtensionPage,
  readGeckoId,
  reloadExtensionPage,
  resolveE2eBrowser as resolveWebxBrowser,
  type E2eBrowser,
  type ExtensionSession
} from "webxdriver"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..")

export type { E2eBrowser }

/** EN: BMXt session is the webXdriver extension session (same shape + extensionPath). */
export type BmxtSession = ExtensionSession

/**
 * EN: Prefer `BMXT_E2E_BROWSER` for backward compatibility with existing scripts/CI.
 * JA: 既存スクリプト／CI 互換のため `BMXT_E2E_BROWSER` を優先する。
 */
export function resolveE2eBrowser(): E2eBrowser {
  return resolveWebxBrowser({
    envKey: "BMXT_E2E_BROWSER",
    defaultBrowser: "chrome"
  })
}

export function extensionOutputPath(browser: E2eBrowser): string {
  return join(root, ".output", browser === "firefox" ? "firefox-mv3" : "chrome-mv3")
}

export { readGeckoId }

function requireExtensionBuild(browser: E2eBrowser): string {
  const extensionPath = extensionOutputPath(browser)
  if (!existsSync(join(extensionPath, "manifest.json"))) {
    const script = browser === "firefox" ? "build:firefox" : "build:chrome"
    throw new Error(`Missing ${extensionPath}. Run \`pnpm run ${script}\` before e2e.`)
  }
  return extensionPath
}

/** EN: Launch headless browser with the unpacked host build loaded (via webXdriver). */
export async function launchBmxtSession(
  browser: E2eBrowser = resolveE2eBrowser()
): Promise<BmxtSession> {
  const extensionPath = requireExtensionBuild(browser)
  const chromeVersion = process.env.BMXT_E2E_CHROME_VERSION?.trim()
  const options: {
    browser: E2eBrowser
    extensionPath: string
    profileBaseDir: string
    chromeVersion?: string
  } = {
    browser,
    extensionPath,
    profileBaseDir: join(root, ".output", "e2e-profiles")
  }
  if (chromeVersion) {
    options.chromeVersion = chromeVersion
  }
  return launchExtensionSession(options)
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

/** EN: Poll until storage shows first-run dismissed (condition wait, not fixed sleep). */
async function waitTutorialDismissedInStorage(
  driver: WebDriver,
  timeoutMs = 15_000
): Promise<boolean> {
  try {
    await driver.wait(async () => {
      const result = await driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1];
        chrome.storage.local
          .get("bmxt_tutorial_progress_v1")
          .then((data) => {
            const progress = data && data.bmxt_tutorial_progress_v1;
            done(
              !!(
                progress &&
                typeof progress === "object" &&
                progress.dismissedFirstRun === true
              )
            );
          })
          .catch(() => done(false));
      `)
      return result === true
    }, timeoutMs)
    return true
  } catch {
    return false
  }
}

async function waitBmxtPromptReady(driver: WebDriver): Promise<void> {
  await driver.wait(until.elementLocated(By.css(".bmxt-prompt-ime")), 60_000)
}

async function navigateToBmxtShell(session: BmxtSession, pageUrl: string): Promise<void> {
  await openExtensionPage(session, pageUrl)
  await waitBmxtPromptReady(session.driver)
}

async function reloadBmxtShell(session: BmxtSession, pageUrl: string): Promise<void> {
  await reloadExtensionPage(session, pageUrl)
  await waitBmxtPromptReady(session.driver)
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
  // EN: First-run auto-start may race and overwrite storage — write, wait for
  //     confirmed storage, write again (no fixed sleep), then reload.
  await dismissFirstRunTutorial(session.driver)
  await waitTutorialDismissedInStorage(session.driver)
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
 * EN: Close tab/side pickers. Filter IME is `pointer-events: none` (not WebDriver-clickable);
 *     focus via script then Escape, or dispatch window keydown for capture listeners.
 * JA: 列ピッカーを閉じる。filter IME は pointer-events:none のため script で focus→Esc、
 *     または window の keydown（capture）を dispatch する。
 */
async function dismissOverlayPickers(driver: WebDriver): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    const open = await driver.findElements(
      By.css(".bmxt-tab-picker, .bmxt-side-picker, .bmxt-subcmd-picker")
    )
    if (open.length === 0) {
      return
    }
    await driver.executeScript(`
      const filter = document.querySelector(".bmxt-tab-picker-filter-ime");
      if (filter && typeof filter.focus === "function") {
        filter.focus({ preventScroll: true });
      }
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        })
      );
    `)
  }
}

/**
 * EN: Between shared-session tests — dismiss pickers and wipe the log so asserts stay isolated.
 *     Shared session is required: Firefox Marionette wedges under per-test relaunch.
 * JA: 共有セッションのテスト間で候補を閉じログをクリアし、アサートを隔離する。
 *     Firefox はテストごと再起動で Marionette が不安定なため共有必須。
 */
export async function resetShellBetweenTests(driver: WebDriver): Promise<void> {
  await dismissPromptPickers(driver)
  await dismissOverlayPickers(driver)
  try {
    await driver.wait(async () => {
      const open = await driver.findElements(
        By.css(".bmxt-tab-picker, .bmxt-side-picker, .bmxt-subcmd-picker")
      )
      return open.length === 0
    }, 5_000)
  } catch {
    /* EN: Best-effort — do not fail the suite on a stuck overlay alone. */
  }
  await runPromptLine(driver, "clear")
  await waitPromptIdle(driver)
  const line = await promptValue(driver)
  if (line !== "") {
    const ime = await focusPrompt(driver)
    await setPromptValueViaInputEvent(driver, ime, "")
  }
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
