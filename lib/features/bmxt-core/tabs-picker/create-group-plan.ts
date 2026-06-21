import { t } from "../../setting/i18n/messages"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { UiLocale } from "../../setting/locale"

export type CreateGroupPlanContext = {
  tabCount: number
  resolvedTabCount: number
  sameWindow: boolean
  windowType: string | null
  groupTabCount: number
  movingCount: number
}

export type CreateGroupPlanResult = {
  ok: boolean
  error: string | null
  strategy: "moveWholeGroup" | "ungroupThenMoveTabs" | null
}

export function resolveCreateGroupPlan(
  ctx: CreateGroupPlanContext,
  locale: UiLocale = getRunLocale()
): CreateGroupPlanResult {
  if (ctx.tabCount === 0) {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.noTabs", locale),
      strategy: null
    }
  }
  if (ctx.resolvedTabCount !== ctx.tabCount) {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.partialClosed", locale),
      strategy: null
    }
  }
  if (!ctx.sameWindow) {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.sameWindow", locale),
      strategy: null
    }
  }
  if (ctx.windowType !== "normal") {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.windowType", locale),
      strategy: null
    }
  }
  if (ctx.movingCount === 0) {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.invalidMoveCount", locale),
      strategy: null
    }
  }
  if (ctx.movingCount > ctx.groupTabCount) {
    return {
      ok: false,
      error: t("tabs.picker.error.createGroup.notInGroup", locale),
      strategy: null
    }
  }
  if (ctx.movingCount === ctx.groupTabCount) {
    return { ok: true, error: null, strategy: "moveWholeGroup" }
  }
  return { ok: true, error: null, strategy: "ungroupThenMoveTabs" }
}

export function resolveTabsPickerCreateGroupPlan<TContext, TResult>(context: TContext): TResult {
  return resolveCreateGroupPlan(context as CreateGroupPlanContext) as TResult
}
