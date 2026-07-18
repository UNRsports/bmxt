import { tTabs, type TabsMessageKey } from "../../setting/i18n/ns/tabs"
import { getRunLocale } from "../../setting/i18n/run-locale"
import type { UiLocale } from "../../setting/locale"
import { wasmTabsPickerValidateExecute } from "../wasm-host"
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

function parseWasmJson<T>(raw: string): T {
  const parsed = JSON.parse(raw) as T | { error?: string }
  if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
    throw new Error(String(parsed.error))
  }
  return parsed as T
}

function localizeReason(reason: string | null, locale: UiLocale): string | null {
  if (!reason) {
    return null
  }
  if (reason.startsWith("tabs.")) {
    return tTabs(reason as TabsMessageKey, locale)
  }
  return reason
}

export function validateTabsPickerExecute<TContext, TResult>(
  context: TContext,
  locale: UiLocale = getRunLocale()
): TResult {
  const raw = wasmTabsPickerValidateExecute(JSON.stringify(context))
  const parsed = parseWasmJson<ExecuteValidation>(raw)
  return {
    ok: parsed.ok,
    reason: localizeReason(parsed.reason, locale)
  } as TResult
}
