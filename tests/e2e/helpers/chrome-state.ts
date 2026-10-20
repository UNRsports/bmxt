/**
 * EN: Read Chrome tab state via the extension service worker.
 * JA: 拡張 Service Worker 経由でタブ状態を読む。
 */

import type { BrowserContext, Worker } from "@playwright/test"

export type TabSnapshot = {
  id: number
  url: string
  title: string
  status: string
}

async function requireServiceWorker(context: BrowserContext): Promise<Worker> {
  let [worker] = context.serviceWorkers()
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 60_000 })
  }
  return worker
}

/** EN: Query all tabs visible to the extension (`chrome.tabs.query`). */
export async function queryExtensionTabs(context: BrowserContext): Promise<TabSnapshot[]> {
  const worker = await requireServiceWorker(context)
  return worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({})
    const out: TabSnapshot[] = []
    for (const tab of tabs) {
      if (typeof tab.id !== "number") {
        continue
      }
      out.push({
        id: tab.id,
        url: tab.url ?? "",
        title: tab.title ?? "",
        status: tab.status ?? ""
      })
    }
    return out
  })
}

export async function countHttpTabs(context: BrowserContext): Promise<number> {
  const tabs = await queryExtensionTabs(context)
  return tabs.filter((t) => t.url.startsWith("http://") || t.url.startsWith("https://")).length
}
