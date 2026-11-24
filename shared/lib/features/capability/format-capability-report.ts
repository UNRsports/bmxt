/**
 * EN: Format capability probe rows as terminal log lines (OK/NG status markers).
 * JA: 能力検査結果をターミナルログ行（OK/NG マーカー付き）に整形する。
 */

import { encodeLogStatusLine } from "../command-line/log-status-marker.ts"
import { tEffect } from "../setting/i18n/ns/effect.ts"
import type { UiLocale } from "../setting/locale.ts"
import type { CapabilityId, CapabilityProbeReport } from "./types.ts"

function labelForCapability(id: CapabilityId, locale: UiLocale): string {
  switch (id) {
    case "tabs":
      return tEffect("effect.capability.item.tabs", locale)
    case "windows":
      return tEffect("effect.capability.item.windows", locale)
    case "tabGroups":
      return tEffect("effect.capability.item.tabGroups", locale)
    case "bookmarks":
      return tEffect("effect.capability.item.bookmarks", locale)
    case "history":
      return tEffect("effect.capability.item.history", locale)
    case "scriptingHost":
      return tEffect("effect.capability.item.scriptingHost", locale)
    case "webrtc":
      return tEffect("effect.capability.item.webrtc", locale)
    case "fsa":
      return tEffect("effect.capability.item.fsa", locale)
    case "translator":
      return tEffect("effect.capability.item.translator", locale)
    default: {
      const _exhaustive: never = id
      return String(_exhaustive)
    }
  }
}

/** EN: Header + one status line per probe row. */
export function formatCapabilityReportLines(
  report: CapabilityProbeReport,
  locale: UiLocale
): string[] {
  const lines: string[] = [tEffect("effect.capability.report.header", locale)]
  for (const row of report.rows) {
    const label = labelForCapability(row.id, locale)
    lines.push(encodeLogStatusLine(label, row.status))
  }
  return lines
}
