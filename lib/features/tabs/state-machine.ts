import { runTabsPickerReduce } from "../wasm-core"
import { resolveTabsPickerEnterIntent } from "../wasm-core"
import { resolveTabsPickerPreview } from "../wasm-core"
import { validateTabsPickerExecute } from "../wasm-core"
import { resolveTabsPickerTarget } from "../wasm-core"
import { resolveTabsPickerGroupTarget } from "../wasm-core"
import { resolveTabsPickerNewWindowOrder } from "../wasm-core"
import { resolveTabsPickerConfirmPlan } from "../wasm-core"
import { resolveTabsPickerMovePlan } from "../wasm-core"
import { chromeTabGroupIdsFromMarkedGroupKeys } from "./tab-picker-keyboard"
import { resolveTabsPickerCreateGroupPlan } from "../wasm-core"
import { resolveTabsPickerHeadline } from "../wasm-core"

export type PickerSelectKind = "window" | "group" | "tab"
export type PickerBulkSubMode = "move" | "close" | "group" | "newWindow"

export type PickerReducerState = {
  hi: number
  moveDestHi: number
  markedKind: PickerSelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: PickerBulkSubMode | null
}

type PickerVariant = "default" | "groupNew"
type GroupNewPhase = "tabs" | "meta"
type EnterIntent =
  | "none"
  | "confirmSelection"
  | "openGroupMeta"
  | "executeClose"
  | "executeMove"
  | "executeGroup"
  | "executeNewWindow"

type PreviewDecision = {
  nextHi: number
  activateTabId: number | null
}

type ExecuteValidation = {
  ok: boolean
  reason: string | null
}

type ResolvedTarget = {
  kind: "tab" | "window" | "group"
  tabId: number | null
  windowId: number | null
  groupId: number | null
} | null

type ResolvedGroupTarget = {
  createNew: boolean
  groupId: number | null
} | null

type ResolvedNewWindowOrder = {
  orderedIds: number[]
}

type ConfirmPlan =
  | { kind: "activateTab"; tabId: number; windowId: number }
  | { kind: "focusWindow"; windowId: number }
  | { kind: "activateFromGroup"; windowId: number; groupId: number | null }
  | null

type MovePlan =
  | {
      targetKind: "tab" | "window" | "group"
      targetTabId: number | null
      targetWindowId: number | null
      targetGroupId: number | null
      shouldUngroupAfterMove: boolean
      shouldGroupToTargetAfterMove: boolean
      tabGroupIdsToMoveAsUnits: number[]
    }
  | null

type CreateGroupPlan = {
  ok: boolean
  error: string | null
  strategy: "moveWholeGroup" | "ungroupThenMoveTabs" | null
}

export type PickerCurrentRow = {
  kind: PickerSelectKind
  tabId?: number
  windowId?: number
  groupKey?: string
}

export type PickerRangeSelectInput = {
  anchor: number
  target: number
  rows: PickerCurrentRow[]
}

export type PickerReducerEvent =
  | { kind: "moveHi"; delta: number; visibleLen: number }
  | { kind: "moveDest"; delta: number; visibleLen: number }
  | { kind: "cycleSubMode"; direction: number; implicitKind?: PickerSelectKind }
  | { kind: "toggleCurrent"; row: PickerCurrentRow }
  | { kind: "selectRange"; input: PickerRangeSelectInput }
  | { kind: "clearMarked" }

export function reducePickerState(
  state: PickerReducerState,
  event: PickerReducerEvent
): PickerReducerState {
  return runTabsPickerReduce<PickerReducerState, PickerReducerEvent>(state, event)
}

export function resolvePickerEnterIntent(
  state: PickerReducerState,
  variant: PickerVariant,
  groupNewPhase: GroupNewPhase,
  selectedTabCount: number,
  isShift: boolean
): EnterIntent {
  return resolveTabsPickerEnterIntent<
    {
      state: PickerReducerState
      variant: PickerVariant
      groupNewPhase: GroupNewPhase
      selectedTabCount: number
      isShift: boolean
    },
    EnterIntent
  >({
    state,
    variant,
    groupNewPhase,
    selectedTabCount,
    isShift
  })
}

export function resolvePickerPreview(
  hi: number,
  delta: number,
  rows: Array<{ kind: PickerSelectKind; tabId?: number }>
): PreviewDecision {
  return resolveTabsPickerPreview<
    { hi: number; delta: number; visibleLen: number; rows: Array<{ kind: PickerSelectKind; tabId?: number }> },
    PreviewDecision
  >({
    hi,
    delta,
    visibleLen: rows.length,
    rows
  })
}

export function validatePickerExecute(
  state: PickerReducerState,
  selectedTabCount: number
): ExecuteValidation {
  return validateTabsPickerExecute<
    {
      markedKind: PickerReducerState["markedKind"]
      bulkSubMode: PickerReducerState["bulkSubMode"]
      selectedTabCount: number
    },
    ExecuteValidation
  >({
    markedKind: state.markedKind,
    bulkSubMode: state.bulkSubMode,
    selectedTabCount
  })
}

export function resolvePickerTarget(
  moveDestHi: number,
  rows: Array<{ kind: "tab" | "window" | "group"; tabId?: number; windowId?: number; groupId?: number | null }>
): ResolvedTarget {
  return resolveTabsPickerTarget<
    {
      moveDestHi: number
      rows: Array<{ kind: "tab" | "window" | "group"; tabId?: number; windowId?: number; groupId?: number | null }>
    },
    ResolvedTarget
  >({
    moveDestHi,
    rows
  })
}

export function resolvePickerGroupTarget(
  pickIndex: number,
  choices: Array<{ id: number }>,
  newGroupSentinel: number
): ResolvedGroupTarget {
  return resolveTabsPickerGroupTarget<
    { pickIndex: number; choices: Array<{ id: number }>; newGroupSentinel: number },
    ResolvedGroupTarget
  >({
    pickIndex,
    choices,
    newGroupSentinel
  })
}

export function resolvePickerNewWindowOrder(
  tabs: Array<{ id: number; windowId: number; index: number }>
): ResolvedNewWindowOrder {
  return resolveTabsPickerNewWindowOrder<
    { tabs: Array<{ id: number; windowId: number; index: number }> },
    ResolvedNewWindowOrder
  >({
    tabs
  })
}

export function resolvePickerConfirmPlan(
  hi: number,
  rows: Array<{ kind: "tab" | "window" | "group"; tabId?: number; windowId?: number; groupId?: number | null }>
): ConfirmPlan {
  return resolveTabsPickerConfirmPlan<
    { hi: number; rows: Array<{ kind: "tab" | "window" | "group"; tabId?: number; windowId?: number; groupId?: number | null }> },
    ConfirmPlan
  >({
    hi,
    rows
  })
}

export function resolvePickerMovePlan(
  markedKind: PickerReducerState["markedKind"],
  target: Exclude<ResolvedTarget, null>,
  markedGroupKeys: string[]
): MovePlan {
  const sourceTabGroupIds = chromeTabGroupIdsFromMarkedGroupKeys(markedGroupKeys)
  return resolveTabsPickerMovePlan<
    {
      markedKind: PickerReducerState["markedKind"]
      targetKind: "tab" | "window" | "group"
      targetTabId: number | null
      targetWindowId: number | null
      targetGroupId: number | null
      sourceTabGroupIds: number[]
    },
    MovePlan
  >({
    markedKind,
    targetKind: target.kind,
    targetTabId: target.tabId,
    targetWindowId: target.windowId,
    targetGroupId: target.groupId,
    sourceTabGroupIds
  })
}

export function resolvePickerHeadline(context: {
  bulkSubMode: PickerReducerState["bulkSubMode"]
  groupNewPhase: GroupNewPhase
  variant: PickerVariant
}): string {
  return resolveTabsPickerHeadline({
    bulkSubMode: context.bulkSubMode,
    groupNewPhase: context.groupNewPhase,
    variant: context.variant
  })
}

export function resolvePickerCreateGroupPlan(context: {
  tabCount: number
  resolvedTabCount: number
  sameWindow: boolean
  windowType: string | null
  groupTabCount: number
  movingCount: number
}): CreateGroupPlan {
  return resolveTabsPickerCreateGroupPlan<
    {
      tabCount: number
      resolvedTabCount: number
      sameWindow: boolean
      windowType: string | null
      groupTabCount: number
      movingCount: number
    },
    CreateGroupPlan
  >(context)
}
