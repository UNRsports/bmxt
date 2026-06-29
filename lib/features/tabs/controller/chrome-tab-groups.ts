import { BMXT_WINDOW_ID_KEY } from "../../extension-storage/keys"
import { tTabs } from "../../setting/i18n/ns/tabs"
import type { UiLocale } from "../../setting/locale"

const GROUPING_NOT_SUPPORTED_MESSAGE = "Grouping is not supported by tabs in this window."

function readChromeLastError(): Error | null {
  const err = chrome.runtime.lastError
  if (!err) {
    return null
  }
  return new Error(err.message)
}

export function isGroupingNotSupportedError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err)
  return message.includes(GROUPING_NOT_SUPPORTED_MESSAGE)
}

export async function callChromeTabsGroup(
  options: chrome.tabs.GroupOptions
): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.group(options, (groupId) => {
      const err = readChromeLastError()
      if (err) {
        reject(err)
        return
      }
      if (typeof groupId !== "number") {
        reject(new Error("tabs.group returned no group id"))
        return
      }
      resolve(groupId)
    })
  })
}

export async function callChromeTabGroupsUpdate(
  groupId: number,
  updateProperties: chrome.tabGroups.UpdateProperties
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabGroups.update(groupId, updateProperties, () => {
      const err = readChromeLastError()
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

async function readBmxtWindowId(): Promise<number | undefined> {
  const r = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
  const id = r[BMXT_WINDOW_ID_KEY]
  return typeof id === "number" && Number.isInteger(id) ? id : undefined
}

async function findGroupableTargetWindowId(
  sourceWindowId: number | undefined,
  locale: UiLocale
): Promise<number> {
  const bmxtWinId = await readBmxtWindowId()
  const normalWins = await chrome.windows.getAll({ windowTypes: ["normal"] })

  const isEligible = (winId: number | undefined): winId is number =>
    winId !== undefined && winId !== sourceWindowId && winId !== bmxtWinId

  for (const win of normalWins) {
    if (!isEligible(win.id)) {
      continue
    }
    const groups = await chrome.tabGroups.query({ windowId: win.id })
    if (groups.length > 0) {
      return win.id
    }
  }

  for (const win of normalWins) {
    if (isEligible(win.id)) {
      return win.id
    }
  }

  const created = await chrome.windows.create({ focused: true, type: "normal" })
  const wid = created.id
  if (wid === undefined) {
    throw new Error(tTabs("tabs.picker.error.createGroup.windowOpenFailed", locale))
  }
  return wid
}

export async function relocateTabsToGroupableWindow(
  tabIds: number[],
  locale: UiLocale,
  sourceWindowId?: number
): Promise<number[]> {
  const targetWinId = await findGroupableTargetWindowId(sourceWindowId, locale)
  const moved = await chrome.tabs.move(tabIds, { windowId: targetWinId, index: -1 })
  const relocated = moved.map((tab) => tab.id).filter((id): id is number => id !== undefined)
  if (relocated.length !== tabIds.length) {
    throw new Error(tTabs("tabs.picker.error.createGroup.tabIdMissing", locale))
  }
  return relocated
}

export async function groupTabsResilient(
  tabIds: number[],
  locale: UiLocale,
  sourceWindowId?: number
): Promise<number> {
  try {
    return await callChromeTabsGroup({ tabIds })
  } catch (err) {
    if (!isGroupingNotSupportedError(err)) {
      throw err
    }
    const relocated = await relocateTabsToGroupableWindow(tabIds, locale, sourceWindowId)
    return await callChromeTabsGroup({ tabIds: relocated })
  }
}
