/**
 * EN: Terminal log assertions for extension E2E (WebDriver).
 * JA: 拡張 E2E 用ターミナルログアサート（WebDriver）。
 */

import assert from "node:assert/strict"
import { By, type WebDriver } from "selenium-webdriver"

export async function outLineElements(driver: WebDriver) {
  return driver.findElements(By.css(".bmxt-out-line"))
}

export async function stderrLineElements(driver: WebDriver) {
  return driver.findElements(By.css(".bmxt-out-line--stderr"))
}

export async function readOutLineTexts(driver: WebDriver): Promise<string[]> {
  const els = await outLineElements(driver)
  const texts: string[] = []
  for (const el of els) {
    texts.push(await el.getText())
  }
  return texts
}

export async function readStderrLineTexts(driver: WebDriver): Promise<string[]> {
  const els = await stderrLineElements(driver)
  const texts: string[] = []
  for (const el of els) {
    texts.push(await el.getText())
  }
  return texts
}

export async function expectNoStderr(driver: WebDriver): Promise<void> {
  const count = (await stderrLineElements(driver)).length
  assert.equal(count, 0, "unexpected stderr log lines")
}

/** EN: At least one log line contains the substring (locale-stable prefixes OK). */
export async function expectLogContains(
  driver: WebDriver,
  substring: string,
  timeoutMs = 15_000
): Promise<void> {
  await driver.wait(async () => {
    const texts = await readOutLineTexts(driver)
    return texts.some((t) => t.includes(substring))
  }, timeoutMs)
}

/** EN: Wait until at least one stdout log line is present. */
export async function waitForOutLine(driver: WebDriver, timeoutMs = 15_000): Promise<void> {
  await driver.wait(async () => (await outLineElements(driver)).length > 0, timeoutMs)
}
