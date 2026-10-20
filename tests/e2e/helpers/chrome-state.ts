/**
 * EN: Read Chrome tab state via the extension page (`chrome.tabs.query`).
 * JA: 拡張ページ経由でタブ状態を読む（`chrome.tabs.query`）。
 */

import type { WebDriver } from "selenium-webdriver"

export type TabSnapshot = {
  id: number
  url: string
  title: string
  status: string
}

/** EN: Query all tabs visible to the extension (`chrome.tabs.query`). */
export async function queryExtensionTabs(driver: WebDriver): Promise<TabSnapshot[]> {
  const result = await driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    chrome.tabs.query({})
      .then((tabs) => {
        const out = [];
        for (const tab of tabs) {
          if (typeof tab.id !== "number") {
            continue;
          }
          out.push({
            id: tab.id,
            url: tab.url ?? "",
            title: tab.title ?? "",
            status: tab.status ?? ""
          });
        }
        done(out);
      })
      .catch((err) => {
        done({ __error: String(err && err.message ? err.message : err) });
      });
  `)

  if (result && typeof result === "object" && "__error" in (result as object)) {
    throw new Error(`chrome.tabs.query failed: ${(result as { __error: string }).__error}`)
  }
  return result as TabSnapshot[]
}

export async function countHttpTabs(driver: WebDriver): Promise<number> {
  const tabs = await queryExtensionTabs(driver)
  return tabs.filter((t) => t.url.startsWith("http://") || t.url.startsWith("https://")).length
}
