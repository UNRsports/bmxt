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
      return mode === "close" || mode === "newTab" || mode === "edit"
    case "group":
      return mode === "move" || mode === "close" || mode === "newWindow" || mode === "edit"
    case "tab":
      return mode !== "edit"
  }
}

function effectiveSelectKind(ctx: ExecuteValidateContext): SelectKind | null {
  if (ctx.markedKind) return ctx.markedKind
  if (ctx.implicitWindowId !== undefined) return "window"
  return null
}

export function validateExecute(ctx: ExecuteValidateContext): ExecuteValidation {
  if (!ctx.bulkSubMode) {
    return {
      ok: false,
      reason: "モード未選択です。←→で処理を選択してください。"
    }
  }
  const kind = effectiveSelectKind(ctx)
  if (!kind) {
    return {
      ok: false,
      reason: "選択対象がありません。Tabで選択してください。"
    }
  }
  if (!allowed(kind, ctx.bulkSubMode)) {
    return {
      ok: false,
      reason: "選択種別ではその処理を実行できません。"
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
        reason: "処理対象のタブがありません。"
      }
    }
  }
  return { ok: true, reason: null }
}

export function validateTabsPickerExecute<TContext, TResult>(context: TContext): TResult {
  return validateExecute(context as ExecuteValidateContext) as TResult
}
