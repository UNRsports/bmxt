import { tCommon } from "../../setting/i18n/ns/common"
import { tTabs } from "../../setting/i18n/ns/tabs"
import type { UiLocale } from "../../setting/locale"
import {
  callChromeTabGroupsUpdate,
  groupTabsResilient,
  relocateTabsToGroupableWindow
} from "./chrome-tab-groups"

type NewGroupCreateParams = {
  tabIds: number[]
  title: string
  /** `tabGroups.Color` 相当の文字列（`NEW_GROUP_COLORS` の要素） */
  color: string
  locale: UiLocale
  onAppendLog?: (lines: string[]) => void | Promise<void>
  resolveCreateGroupPlan: (context: {
    tabCount: number
    resolvedTabCount: number
    sameWindow: boolean
    windowType: string | null
    groupTabCount: number
    movingCount: number
  }) => { ok: boolean; error: string | null; strategy: "moveWholeGroup" | "ungroupThenMoveTabs" | null }
}

type GroupCreateBaseParams = {
  tabIds: number[]
  title: string
  color: string
  locale: UiLocale
  onAppendLog?: (lines: string[]) => void | Promise<void>
}

type CreateGroupStrategy = "moveWholeGroup" | "ungroupThenMoveTabs"

type StrategyContext = {
  groupId: number
  idsToMove: number[]
  locale: UiLocale
}

type ResolvedTabsForGroup = {
  tabIds: number[]
  tabs: chrome.tabs.Tab[]
  sameWindow: boolean
  windowType: string | null
  sourceWindowId: number | undefined
}

async function resolveTabsForGroupCreate(
  tabIds: number[],
  locale: UiLocale,
  onAppendLog?: (lines: string[]) => void | Promise<void>
): Promise<ResolvedTabsForGroup | null> {
  if (tabIds.length === 0) {
    await onAppendLog?.([`error: ${tTabs("tabs.picker.error.createGroup.noTabs", locale)}`])
    return null
  }

  const tabs = await Promise.all(tabIds.map((id) => chrome.tabs.get(id).catch(() => undefined)))
  const ok = tabs.filter((tab): tab is chrome.tabs.Tab => tab !== undefined)
  if (ok.length !== tabIds.length) {
    await onAppendLog?.([
      `error: ${tTabs("tabs.picker.error.createGroup.partialClosed", locale)}`
    ])
    return null
  }

  const sourceWindowId = ok[0]?.windowId
  const sameWindow =
    sourceWindowId !== undefined && !ok.some((tab) => tab.windowId !== sourceWindowId)
  if (!sameWindow) {
    await onAppendLog?.([`error: ${tTabs("tabs.picker.error.createGroup.sameWindow", locale)}`])
    return null
  }

  const win = await chrome.windows.get(sourceWindowId!).catch(() => undefined)
  const windowType = win?.type ?? null
  let effectiveTabIds = tabIds
  if (windowType !== "normal") {
    const relocated = await relocateTabsToGroupableWindow(tabIds, locale, sourceWindowId)
    effectiveTabIds = relocated.tabIds
  }

  const effectiveTabs = await Promise.all(
    effectiveTabIds.map((id) => chrome.tabs.get(id).catch(() => undefined))
  )
  const resolved = effectiveTabs.filter((tab): tab is chrome.tabs.Tab => tab !== undefined)
  if (resolved.length !== effectiveTabIds.length) {
    await onAppendLog?.([
      `error: ${tTabs("tabs.picker.error.createGroup.partialClosed", locale)}`
    ])
    return null
  }

  const effectiveWinId = resolved[0]?.windowId
  const effectiveSameWindow =
    effectiveWinId !== undefined && !resolved.some((tab) => tab.windowId !== effectiveWinId)
  if (!effectiveSameWindow) {
    await onAppendLog?.([`error: ${tTabs("tabs.picker.error.createGroup.sameWindow", locale)}`])
    return null
  }

  const effectiveWin = await chrome.windows.get(effectiveWinId!).catch(() => undefined)
  return {
    tabIds: effectiveTabIds,
    tabs: resolved,
    sameWindow: effectiveSameWindow,
    windowType: effectiveWin?.type ?? null,
    sourceWindowId: effectiveWinId
  }
}

async function applyGroupMetadata(
  groupId: number,
  title: string,
  color: string
): Promise<void> {
  const trimmedTitle = title.trim()
  const updatePayload: chrome.tabGroups.UpdateProperties = {
    color: color as chrome.tabGroups.UpdateProperties["color"]
  }
  if (trimmedTitle.length > 0) {
    updatePayload.title = trimmedTitle
  }
  await callChromeTabGroupsUpdate(groupId, updatePayload)
}

const CREATE_GROUP_STRATEGY_EXECUTORS: Record<
  CreateGroupStrategy,
  (ctx: StrategyContext) => Promise<number>
> = {
  moveWholeGroup: async ({ groupId, locale }) => {
    const created = await chrome.windows.create({ focused: true })
    const wid = created.id
    if (wid === undefined) {
      throw new Error(tTabs("tabs.picker.error.createGroup.windowOpenFailed", locale))
    }
    const movedGroup = await chrome.tabGroups.move(groupId, { windowId: wid, index: -1 })
    const effectiveGid = movedGroup?.id ?? groupId
    const groupedInWin = await chrome.tabs.query({ groupId: effectiveGid })
    const keepIds = new Set(
      groupedInWin.map((tab) => tab.id).filter((id): id is number => id !== undefined)
    )
    if (keepIds.size > 0) {
      const stray = await chrome.tabs.query({ windowId: wid })
      for (const tab of stray) {
        if (tab.id !== undefined && !keepIds.has(tab.id)) {
          await chrome.tabs.remove(tab.id)
        }
      }
    }
    return wid
  },
  ungroupThenMoveTabs: async ({ idsToMove, locale }) => {
    await chrome.tabs.ungroup(idsToMove)
    const firstId = idsToMove[0]
    if (firstId === undefined) {
      throw new Error(tTabs("tabs.picker.error.createGroup.tabIdMissing", locale))
    }
    const restIds = idsToMove.slice(1)
    const created = await chrome.windows.create({ tabId: firstId, focused: true })
    const wid = created.id
    if (wid === undefined) {
      throw new Error(tTabs("tabs.picker.error.createGroup.windowOpenFailed", locale))
    }
    if (restIds.length > 0) {
      await chrome.tabs.move(restIds, { windowId: wid, index: -1 })
    }
    return wid
  }
}

/** `[GROUP]` → 新しいグループ: 同じウィンドウ内でグループ化のみ（タブ順は維持） */
export async function executeCreateGroupInPlaceAction(
  params: GroupCreateBaseParams
): Promise<boolean> {
  const { color, locale, onAppendLog } = params
  const trimmedTitle = params.title.trim()

  try {
    const resolved = await resolveTabsForGroupCreate(params.tabIds, locale, onAppendLog)
    if (!resolved) {
      return false
    }

    const groupId = await groupTabsResilient(
      resolved.tabIds,
      locale,
      resolved.sourceWindowId
    )
    await applyGroupMetadata(groupId, trimmedTitle, color)

    const label = trimmedTitle || tCommon("common.untitled", locale)
    await onAppendLog?.([
      tTabs("tabs.picker.error.createGroup.successInPlace", locale, {
        groupId: String(groupId),
        color,
        label
      })
    ])
    return true
  } catch (err) {
    const detail = err instanceof Error ? err.message : typeof err === "string" ? err : String(err)
    await onAppendLog?.([
      tTabs("tabs.picker.error.createGroup.failed", locale, { detail })
    ])
    return false
  }
}

/** `group new` 対話フロー: グループ化後に新しいウィンドウへ移動 */
export async function executeCreateNewGroupAction(
  params: NewGroupCreateParams
): Promise<boolean> {
  const { color, locale, onAppendLog } = params
  const trimmedTitle = params.title.trim()

  try {
    const resolved = await resolveTabsForGroupCreate(params.tabIds, locale, onAppendLog)
    if (!resolved) {
      return false
    }

    const { tabIds, sameWindow, windowType, sourceWindowId } = resolved
    const resolvedTabCount = tabIds.length

    const groupId = await groupTabsResilient(tabIds, locale, sourceWindowId)
    await applyGroupMetadata(groupId, trimmedTitle, color)

    const groupedTabs = await chrome.tabs.query({ groupId })
    const groupTabCount = groupedTabs.length
    const groupIdSet = new Set(
      groupedTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined)
    )
    const ordered = [...groupedTabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const idsToMove = ordered.map((tab) => tab.id).filter((id): id is number => id !== undefined)
    const movingCount = idsToMove.length

    const allInGroup = !idsToMove.some((id) => !groupIdSet.has(id))

    const plan = params.resolveCreateGroupPlan({
      tabCount: tabIds.length,
      resolvedTabCount,
      sameWindow,
      windowType,
      groupTabCount,
      movingCount
    })
    if (!allInGroup) {
      throw new Error(tTabs("tabs.picker.error.createGroup.notInGroup", locale))
    }
    if (!plan.ok || !plan.strategy) {
      await onAppendLog?.([
        `error: ${plan.error ?? tTabs("tabs.picker.error.createGroup.planFailed", locale)}`
      ])
      return false
    }

    const strategy = plan.strategy as CreateGroupStrategy
    const executor = CREATE_GROUP_STRATEGY_EXECUTORS[strategy]
    if (!executor) {
      throw new Error(tTabs("tabs.picker.error.createGroup.invalidMoveCount", locale))
    }
    const newWinId = await executor({ groupId, idsToMove, locale })

    const label = trimmedTitle || tCommon("common.untitled", locale)
    await onAppendLog?.([
      tTabs("tabs.picker.error.createGroup.success", locale, {
        groupId: String(groupId),
        windowId: String(newWinId),
        color,
        label
      })
    ])
    return true
  } catch (err) {
    const detail = err instanceof Error ? err.message : typeof err === "string" ? err : String(err)
    await onAppendLog?.([
      tTabs("tabs.picker.error.createGroup.failed", locale, { detail })
    ])
    return false
  }
}
