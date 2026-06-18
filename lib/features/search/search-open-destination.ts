import { displayTitle } from "../tabs/picker-rows"
import { getWindowDisplayNamesMap, pruneWindowDisplayNames } from "../extension-storage/window-display-names"
import { resolveMirrorBrowserWindowId } from "../tabs/resolve-mirror-browser-window"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../setting/locale"
import { t } from "../setting/i18n/messages"
export { searchEntryOffersOpenDestination } from "../side-picker/model/picker-entry"

export type SearchOpenDestinationKind = "new_window" | "window" | "group" | "ungrouped"

export type SearchOpenDestinationRow = {
  kind: SearchOpenDestinationKind
  label: string
  windowId?: number
  groupId?: number
}

const TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE

function formatGroupLabel(g: chrome.tabGroups.TabGroup, locale: UiLocale): string {
  const raw = (g.title || "").trim()
  if (!raw) {
    return t("search.openDestination.untitledGroup", locale, { color: g.color })
  }
  return `【${displayTitle(raw)}】`
}

/**
 * EN: Build flat destination rows: new window, then per-window tree (window, ungrouped, groups).
 */
export async function buildSearchOpenDestinationRows(
  locale: UiLocale = DEFAULT_UI_LOCALE
): Promise<SearchOpenDestinationRow[]> {
  const [tabs, groups, winsMeta, trackedWindowId] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({}),
    chrome.windows.getAll({ populate: false, windowTypes: ["normal"] }),
    resolveMirrorBrowserWindowId()
  ])

  const openWindowIds: number[] = []
  for (const w of winsMeta) {
    if (w.id !== undefined) {
      openWindowIds.push(w.id)
    }
  }
  await pruneWindowDisplayNames(openWindowIds)
  const windowDisplayNames = await getWindowDisplayNamesMap()

  const tabsByWindow = new Map<number, chrome.tabs.Tab[]>()
  for (const t of tabs) {
    const wid = t.windowId
    if (wid === undefined) {
      continue
    }
    const arr = tabsByWindow.get(wid)
    if (arr) {
      arr.push(t)
    } else {
      tabsByWindow.set(wid, [t])
    }
  }

  const groupsByWindow = new Map<number, chrome.tabGroups.TabGroup[]>()
  for (const g of groups) {
    if (g.id === undefined || g.id === TAB_GROUP_ID_NONE) {
      continue
    }
    const wid = g.windowId ?? 0
    const arr = groupsByWindow.get(wid)
    if (arr) {
      arr.push(g)
    } else {
      groupsByWindow.set(wid, [g])
    }
  }

  const windowOrder = [...openWindowIds].sort((a, b) => a - b)
  const activeTabByWindow = new Map<number, chrome.tabs.Tab>()
  await Promise.all(
    windowOrder.map(async (wid) => {
      try {
        const activeTabs = await chrome.tabs.query({ windowId: wid, active: true })
        const t = activeTabs[0]
        if (t) {
          activeTabByWindow.set(wid, t)
        }
      } catch {
        /* window may have closed */
      }
    })
  )

  const rows: SearchOpenDestinationRow[] = [
    { kind: "new_window", label: t("search.openDestination.newWindow", locale) }
  ]

  for (const wid of windowOrder) {
    const wTabs = tabsByWindow.get(wid) ?? []
    const active =
      activeTabByWindow.get(wid) ?? wTabs.find((t) => t.active) ?? wTabs[0]
    const tracked = trackedWindowId !== undefined && wid === trackedWindowId
    const customName = windowDisplayNames.get(wid)
    const windowTitle =
      customName !== undefined
        ? customName
        : displayTitle(active?.title ?? "")
    const windowLabel = t("tabs.picker.windowLabel", locale, {
      star: tracked ? "*" : " ",
      title: windowTitle
    })

    rows.push({ kind: "window", windowId: wid, label: windowLabel })
    rows.push({
      kind: "ungrouped",
      windowId: wid,
      label: t("search.openDestination.ungrouped", locale)
    })

    const windowGroups = (groupsByWindow.get(wid) ?? []).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    for (const g of windowGroups) {
      if (g.id === undefined) {
        continue
      }
      rows.push({
        kind: "group",
        windowId: wid,
        groupId: g.id,
        label: formatGroupLabel(g, locale)
      })
    }
  }

  return rows
}

async function focusCreatedTab(tabId: number, windowId: number): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.tabs.update(tabId, { active: true }, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
  await new Promise<void>((resolve) => {
    chrome.windows.update(windowId, { focused: true }, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

/**
 * EN: Open a URL at the destination chosen in the search picker.
 * JA: search ピッカーで選んだ開き先へ URL を開く。
 */
export async function openUrlAtSearchDestination(
  urlRaw: string,
  dest: SearchOpenDestinationRow
): Promise<string[]> {
  const url = normalizePickerOpenUrl(urlRaw)

  if (dest.kind === "new_window") {
    const props: chrome.windows.CreateData = {}
    if (url !== undefined) {
      props.url = url
    }
    const w = await chrome.windows.create(props)
    const line =
      url !== undefined
        ? `opened new window ${w.id ?? "?"}: ${url}`
        : `opened new window ${w.id ?? "?"}`
    return [line]
  }

  const windowId = dest.windowId
  if (windowId === undefined) {
    return ["search — invalid open destination (missing window)"]
  }

  const createProps: chrome.tabs.CreateProperties = { windowId }
  if (url !== undefined) {
    createProps.url = url
  }

  let tab: chrome.tabs.Tab | undefined
  try {
    tab = await chrome.tabs.create(createProps)
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    try {
      const fallback: chrome.tabs.CreateProperties =
        url !== undefined ? { url, active: false } : { active: false }
      tab = await chrome.tabs.create(fallback)
      if (tab.id !== undefined) {
        tab = await chrome.tabs.move(tab.id, { windowId, index: -1 })
      }
    } catch (e2) {
      const reason2 = e2 instanceof Error ? e2.message : String(e2)
      return [`search — could not open tab: ${reason}`, `fallback: ${reason2}`]
    }
  }

  if (tab?.id === undefined) {
    return ["search — could not open tab"]
  }

  if (dest.kind === "group" && dest.groupId !== undefined) {
    try {
      await chrome.tabs.group({ groupId: dest.groupId, tabIds: tab.id })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      await focusCreatedTab(tab.id, windowId)
      return [`search — opened tab but could not add to group: ${reason}`]
    }
  }

  await focusCreatedTab(tab.id, windowId)

  const destLabel =
    dest.kind === "group"
      ? `group ${dest.groupId}`
      : dest.kind === "ungrouped"
        ? "ungrouped"
        : `window ${windowId}`
  const urlPart = url !== undefined ? `: ${url}` : ""
  return [`opened tab ${tab.id} in ${destLabel}${urlPart}`]
}
