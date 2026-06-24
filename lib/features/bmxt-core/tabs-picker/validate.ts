import { tTabs } from "../../setting/i18n/ns/tabs"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { UiLocale } from "../../setting/locale"
import type { BulkSubMode, SelectKind } from "./model"

export type ExecuteValidateContext = {
  markedKind: SelectKind | null
  bulkSubMode: BulkSubMode | null
  selectedTabCount: number
  implicitWindowId?: number
}

export type ExecuteValidation = {
  ok: boolean
  reason: string | null
}

function allowed(kind: SelectKind, mode: BulkSubMode): boolean {
  switch (kind) {
    case "window":
      return mode === "close" || mode === "newTab" || mode === "edit" || mode === "reload"
    case "group":
      return mode === "move" || mode === "close" || mode === "newWindow" || mode === "edit" || mode === "reload"
    case "tab":
      return mode !== "edit"
  }
}

function effectiveSelectKind(ctx: ExecuteValidateContext): SelectKind | null {
  if (ctx.markedKind) return ctx.markedKind
  if (ctx.implicitWindowId !== undefined) return "window"
  return null
}

export function validateExecute(
  ctx: ExecuteValidateContext,
  locale: UiLocale = getRunLocale()
): ExecuteValidation {
  if (!ctx.bulkSubMode) {
    return {
      ok: false,
      reason: tTabs("tabs.picker.error.noBulkMode", locale)
    }
  }
  const kind = effectiveSelectKind(ctx)
  if (!kind) {
    return {
      ok: false,
      reason: tTabs("tabs.picker.error.noSelection", locale)
    }
  }
  if (!allowed(kind, ctx.bulkSubMode)) {
    return {
      ok: false,
      reason: tTabs("tabs.picker.error.invalidBulkForKind", locale)
    }
  }
  if (ctx.selectedTabCount === 0) {
    const allowWithoutTabs =
      (kind === "window" && ctx.bulkSubMode === "close") ||
      (kind === "window" && ctx.bulkSubMode === "newTab") ||
      (kind === "window" && ctx.bulkSubMode === "edit") ||
      (kind === "group" && ctx.bulkSubMode === "edit")
    if (!allowWithoutTabs) {
      return {
        ok: false,
        reason: tTabs("tabs.picker.error.noTabsForAction", locale)
      }
    }
  }
  return { ok: true, reason: null }
}

export function validateTabsPickerExecute<TContext, TResult>(context: TContext): TResult {
  return validateExecute(context as ExecuteValidateContext) as TResult
}
