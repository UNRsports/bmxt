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

export function resolveCreateGroupPlan(ctx: CreateGroupPlanContext): CreateGroupPlanResult {
  if (ctx.tabCount === 0) {
    return {
      ok: false,
      error: "選択されたタブがありません（一覧に戻り Tab で選び直してください）。",
      strategy: null
    }
  }
  if (ctx.resolvedTabCount !== ctx.tabCount) {
    return {
      ok: false,
      error: "選択したタブの一部が閉じられています。",
      strategy: null
    }
  }
  if (!ctx.sameWindow) {
    return {
      ok: false,
      error: "選択したタブは同じウィンドウ内である必要があります。",
      strategy: null
    }
  }
  if (ctx.windowType !== "normal") {
    return {
      ok: false,
      error:
        "このウィンドウ種別ではタブグループを使えません（Chrome は通常ウィンドウ normal のみ）。popup・app・devtools などではグループ化できません。ウェブページを開いた通常ブラウザウィンドウのタブを選んでください。",
      strategy: null
    }
  }
  if (ctx.movingCount === 0) {
    return { ok: false, error: "移動するタブ数が不正です", strategy: null }
  }
  if (ctx.movingCount > ctx.groupTabCount) {
    return {
      ok: false,
      error: "移動対象タブがグループに含まれていません",
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
