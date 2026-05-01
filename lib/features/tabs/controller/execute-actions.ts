type MovePlan = {
  targetKind: "tab" | "window" | "group"
  targetTabId: number | null
  targetWindowId: number | null
  targetGroupId: number | null
  shouldUngroupAfterMove: boolean
  shouldGroupToTargetAfterMove: boolean
}

export type ExecutionIntent = "executeClose" | "executeMove" | "executeGroup" | "executeNewWindow"

type GroupTarget = {
  createNew: boolean
  groupId: number | null
}

type NewWindowOrder = {
  orderedIds: number[]
}

export async function executeCloseAction(params: {
  markedKind: "window" | "group" | "tab" | null
  markedWindowIds: number[]
  selectedTabIds: number[]
}): Promise<void> {
  if (params.markedKind === "window" && params.markedWindowIds.length > 0) {
    await Promise.all(params.markedWindowIds.map((wid) => chrome.windows.remove(wid)))
    return
  }
  if (params.selectedTabIds.length === 0) {
    return
  }
  await chrome.tabs.remove(params.selectedTabIds)
}

export async function executeMoveAction(params: {
  plan: MovePlan
  selectedTabIds: number[]
}): Promise<void> {
  const toMove = [...params.selectedTabIds]
  if (toMove.length === 0) {
    return
  }
  const { plan } = params
  if (plan.targetKind === "tab" && plan.targetTabId !== null) {
    const destTab = await chrome.tabs.get(plan.targetTabId)
    const winId = destTab.windowId
    const idx = destTab.index ?? 0
    if (winId === undefined) {
      return
    }
    await chrome.tabs.move(toMove, { windowId: winId, index: idx })
    if (plan.shouldGroupToTargetAfterMove && plan.targetGroupId !== null) {
      await chrome.tabs.group({ groupId: plan.targetGroupId, tabIds: toMove })
    } else if (plan.shouldUngroupAfterMove) {
      await chrome.tabs.ungroup(toMove)
    }
    return
  }
  if (plan.targetKind === "window" && plan.targetWindowId !== null) {
    await chrome.tabs.move(toMove, { windowId: plan.targetWindowId, index: -1 })
    if (plan.shouldUngroupAfterMove) {
      await chrome.tabs.ungroup(toMove)
    }
    return
  }
  if (plan.targetKind === "group" && plan.targetWindowId !== null) {
    await chrome.tabs.move(toMove, { windowId: plan.targetWindowId, index: -1 })
    if (plan.shouldGroupToTargetAfterMove && plan.targetGroupId !== null) {
      await chrome.tabs.group({ groupId: plan.targetGroupId, tabIds: toMove })
    } else if (plan.shouldUngroupAfterMove) {
      await chrome.tabs.ungroup(toMove)
    }
  }
}

export async function executeGroupAction(params: {
  target: GroupTarget
  selectedTabIds: number[]
  onOpenCreateNewMeta: () => void
}): Promise<void> {
  if (params.target.createNew) {
    params.onOpenCreateNewMeta()
    return
  }
  if (params.target.groupId === null) {
    return
  }
  await chrome.tabs.group({ groupId: params.target.groupId, tabIds: params.selectedTabIds })
}

export async function executeNewWindowAction(params: {
  selectedTabIds: number[]
  order: NewWindowOrder
}): Promise<void> {
  if (params.selectedTabIds.length === 0) {
    return
  }
  const orderedIds = params.order.orderedIds
  const first = orderedIds[0]
  if (first === undefined) {
    return
  }
  const rest = orderedIds.slice(1)
  const created = await chrome.windows.create({ tabId: first })
  const newWinId = created.id
  if (newWinId === undefined) {
    return
  }
  if (rest.length > 0) {
    await chrome.tabs.move(rest, { windowId: newWinId, index: -1 })
  }
}

export type ExecutionContext = {
  markedKind: "window" | "group" | "tab" | null
  markedWindowIds: number[]
  selectedTabIds: number[]
  movePlan?: MovePlan | null
  groupTarget?: GroupTarget | null
  newWindowOrder?: NewWindowOrder
  onOpenCreateNewMeta?: () => void
}

export const EXECUTION_REGISTRY: Record<
  ExecutionIntent,
  (ctx: ExecutionContext) => Promise<void>
> = {
  executeClose: async (ctx) => {
    await executeCloseAction({
      markedKind: ctx.markedKind,
      markedWindowIds: ctx.markedWindowIds,
      selectedTabIds: ctx.selectedTabIds
    })
  },
  executeMove: async (ctx) => {
    if (!ctx.movePlan) {
      return
    }
    await executeMoveAction({ plan: ctx.movePlan, selectedTabIds: ctx.selectedTabIds })
  },
  executeGroup: async (ctx) => {
    if (!ctx.groupTarget) {
      return
    }
    await executeGroupAction({
      target: ctx.groupTarget,
      selectedTabIds: ctx.selectedTabIds,
      onOpenCreateNewMeta: ctx.onOpenCreateNewMeta ?? (() => undefined)
    })
  },
  executeNewWindow: async (ctx) => {
    if (!ctx.newWindowOrder) {
      return
    }
    await executeNewWindowAction({
      selectedTabIds: ctx.selectedTabIds,
      order: ctx.newWindowOrder
    })
  }
}
