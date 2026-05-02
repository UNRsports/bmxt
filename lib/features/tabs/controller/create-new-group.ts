type NewGroupCreateParams = {
  tabIds: number[]
  title: string
  /** `tabGroups.Color` 相当の文字列（`NEW_GROUP_COLORS` の要素） */
  color: string
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onExit: () => void
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
}

const CREATE_GROUP_STRATEGY_EXECUTORS: Record<
  CreateGroupStrategy,
  (ctx: StrategyContext) => Promise<number>
> = {
  moveWholeGroup: async ({ groupId }) => {
    const created = await chrome.windows.create({ focused: true })
    const wid = created.id
    if (wid === undefined) {
      throw new Error("新しいウィンドウを開けませんでした")
    }
    const movedGroup = await chrome.tabGroups.move(groupId, { windowId: wid, index: -1 })
    const effectiveGid = movedGroup?.id ?? groupId
    const groupedInWin = await chrome.tabs.query({ groupId: effectiveGid })
    const keepIds = new Set(
      groupedInWin.map((t) => t.id).filter((id): id is number => id !== undefined)
    )
    if (keepIds.size > 0) {
      const stray = await chrome.tabs.query({ windowId: wid })
      for (const t of stray) {
        if (t.id !== undefined && !keepIds.has(t.id)) {
          await chrome.tabs.remove(t.id)
        }
      }
    }
    return wid
  },
  ungroupThenMoveTabs: async ({ idsToMove }) => {
    await chrome.tabs.ungroup(idsToMove)
    const firstId = idsToMove[0]
    if (firstId === undefined) {
      throw new Error("タブ ID を確定できませんでした")
    }
    const restIds = idsToMove.slice(1)
    const created = await chrome.windows.create({ tabId: firstId, focused: true })
    const wid = created.id
    if (wid === undefined) {
      throw new Error("新しいウィンドウを開けませんでした")
    }
    if (restIds.length > 0) {
      await chrome.tabs.move(restIds, { windowId: wid, index: -1 })
    }
    return wid
  }
}

export async function executeCreateNewGroupAction(params: NewGroupCreateParams): Promise<void> {
  const { tabIds, color, onAppendLog, onExit } = params
  const trimmedTitle = params.title.trim()
  if (tabIds.length === 0) {
    await onAppendLog?.([
      "error: 選択されたタブがありません（一覧に戻り Tab で選び直してください）。"
    ])
    return
  }

  try {
    const tabs = await Promise.all(tabIds.map((id) => chrome.tabs.get(id).catch(() => undefined)))
    const ok = tabs.filter((t): t is chrome.tabs.Tab => t !== undefined)
    const resolvedTabCount = ok.length
    if (resolvedTabCount !== tabIds.length) {
      await onAppendLog?.(["error: 選択したタブの一部が閉じられています。"])
      return
    }
    const winId = ok[0]?.windowId
    const sameWindow =
      winId !== undefined && !ok.some((t) => t.windowId !== winId)
    if (!sameWindow) {
      await onAppendLog?.([
        "error: 選択したタブは同じウィンドウ内である必要があります。"
      ])
      return
    }

    const win = await chrome.windows.get(winId!).catch(() => undefined)
    const windowType = win?.type ?? null
    if (windowType !== "normal") {
      await onAppendLog?.([
        "error: このウィンドウ種別ではタブグループを使えません（Chrome は通常ウィンドウ normal のみ）。popup・app・devtools などではグループ化できません。ウェブページを開いた通常ブラウザウィンドウのタブを選んでください。"
      ])
      return
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
      groupedTabs.map((t) => t.id).filter((id): id is number => id !== undefined)
    )
    const ordered = [...groupedTabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const idsToMove = ordered.map((t) => t.id).filter((id): id is number => id !== undefined)
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
      throw new Error("移動対象タブがグループに含まれていません")
    }
    if (!plan.ok || !plan.strategy) {
      await onAppendLog?.([`error: ${plan.error ?? "グループ作成計画に失敗しました。"}`])
      return
    }

    const strategy = plan.strategy as CreateGroupStrategy
    const executor = CREATE_GROUP_STRATEGY_EXECUTORS[strategy]
    if (!executor) {
      throw new Error("移動するタブ数が不正です")
    }
    const newWinId = await executor({ groupId, idsToMove })

    const label = trimmedTitle || "(無題)"
    await onAppendLog?.([`created group ${groupId} in new window ${newWinId} · ${color} · "${label}"`])
    onExit()
  } catch (err) {
    const detail = err instanceof Error ? err.message : typeof err === "string" ? err : String(err)
    await onAppendLog?.([`error: グループ作成に失敗しました — ${detail}`])
  }
}
