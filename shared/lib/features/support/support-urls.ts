import { createTabInNormalBrowserWindow } from "../dispatch/handlers/shared"

/** EN: Official product site (BMXt). */
export const SUPPORT_OFFICIAL_SITE_URL = "https://bmxt.diozy.net/" as const

/** EN: Manual / Q&A support via NotebookLM. */
export const SUPPORT_MANUAL_NOTEBOOK_URL =
  "https://notebook.google.com/notebook/6a3709e9-ef49-48fe-a711-eafa68be16bf" as const

export type SupportLinkUrl =
  | typeof SUPPORT_OFFICIAL_SITE_URL
  | typeof SUPPORT_MANUAL_NOTEBOOK_URL

const ALLOWED_SUPPORT_URLS: ReadonlySet<string> = new Set([
  SUPPORT_OFFICIAL_SITE_URL,
  SUPPORT_MANUAL_NOTEBOOK_URL
])

/**
 * EN: Open a fixed support URL in a normal browser tab (not the BMXt shell window).
 * Only allowlisted URLs are accepted.
 */
export async function openSupportLinkInTab(url: SupportLinkUrl): Promise<void> {
  if (!ALLOWED_SUPPORT_URLS.has(url)) {
    return
  }
  await createTabInNormalBrowserWindow(url)
}
