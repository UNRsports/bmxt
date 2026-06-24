import { tCommon } from "../../setting/i18n/ns/common"
import { tTabs } from "../../setting/i18n/ns/tabs"
import type { UiLocale } from "../../setting/locale"

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

type CreateGroupStrategy = "moveWholeGroup" | "ungroupThenMoveTabs"

type StrategyContext = {
  groupId: number
  idsToMove: number[]
  locale: UiLocale
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

/** 成功時は true（呼び出し側でタブピッカーを維持したまま UI を戻す） */
export async function executeCreateNewGroupAction(
  params: NewGroupCreateParams
): Promise<boolean> {
  const { tabIds, color, locale, onAppendLog } = params
  const trimmedTitle = params.title.trim()
  if (tabIds.length === 0) {
    await onAppendLog?.([
      `error: ${tTabs("tabs.picker.error.createGroup.noTabs", locale)}`
    ])
    return false
  }

  try {
    const tabs = await Promise.all(tabIds.map((id) => chrome.tabs.get(id).catch(() => undefined)))
    const ok = tabs.filter((tab): tab is chrome.tabs.Tab => tab !== undefined)
    const resolvedTabCount = ok.length
    if (resolvedTabCount !== tabIds.length) {
      await onAppendLog?.([
        `error: ${tTabs("tabs.picker.error.createGroup.partialClosed", locale)}`
      ])
      return false
    }
    const winId = ok[0]?.windowId
    const sameWindow =
      winId !== undefined && !ok.some((tab) => tab.windowId !== winId)
    if (!sameWindow) {
      await onAppendLog?.([
        `error: ${tTabs("tabs.picker.error.createGroup.sameWindow", locale)}`
      ])
      return false
    }

    const win = await chrome.windows.get(winId!).catch(() => undefined)
    const windowType = win?.type ?? null
    if (windowType !== "normal") {
      await onAppendLog?.([
        `error: ${tTabs("tabs.picker.error.createGroup.windowType", locale)}`
      ])
      return false
    }

    const groupId = await chrome.tabs.group({ tabIds })
    const updatePayload: chrome.tabGroups.UpdateProperties = {
      color: color as chrome.tabGroups.UpdateProperties["color"]
    }
    if (trimmedTitle.length > 0) {
      updatePayload.title = trimmedTitle
    }
    await chrome.tabGroups.update(groupId, updatePayload)

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
