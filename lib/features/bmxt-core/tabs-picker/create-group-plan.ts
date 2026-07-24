import { tTabs, type TabsMessageKey } from "../../setting/i18n/ns/tabs"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { UiLocale } from "../../setting/locale"
import { wasmTabsPickerCreateGroupPlan } from "../wasm-host"
import { parseWasmJson } from "./parse-wasm-json"

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

function localizeError(error: string | null, locale: UiLocale): string | null {
  if (!error) {
    return null
  }
  if (error.startsWith("tabs.")) {
    return tTabs(error as TabsMessageKey, locale)
  }
  return error
}

export function resolveTabsPickerCreateGroupPlan<TContext, TResult>(
  context: TContext,
  locale: UiLocale = getRunLocale()
): TResult {
  const raw = wasmTabsPickerCreateGroupPlan(JSON.stringify(context))
  const parsed = parseWasmJson<{
    ok: boolean
    error: string | null
    strategy: string | null
  }>(raw)
  return {
    ok: parsed.ok,
    error: localizeError(parsed.error, locale),
    strategy: parsed.strategy as CreateGroupPlanResult["strategy"]
  } as TResult
}
