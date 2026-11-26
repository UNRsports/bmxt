/**
 * EN: Handle peer `probe_capabilities` — run browser capability report lines.
 * JA: peer `probe_capabilities` — ブラウザ能力レポート行を返す。
 */

import { runCapabilityReportLines } from "../../capability/run-capability-report.ts"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../../setting/locale.ts"

function localeFromWire(raw: string): UiLocale {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed === "ja" || trimmed.startsWith("ja")) {
    return "ja"
  }
  return DEFAULT_UI_LOCALE
}

export async function applyRemoteProbeCapabilities(localeRaw: string): Promise<{
  ok: boolean
  detail: string | null
  lines: string[]
}> {
  try {
    const lines = await runCapabilityReportLines(localeFromWire(localeRaw))
    return { ok: true, detail: null, lines }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message, lines: [] }
  }
}
