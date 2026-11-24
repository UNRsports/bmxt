/**
 * EN: Probe + format capability report for terminal append.
 * JA: 能力検査を実行しターミナル追記用に整形する。
 */

import type { UiLocale } from "../setting/locale.ts"
import { formatCapabilityReportLines } from "./format-capability-report.ts"
import { probeCapabilities } from "./probe-capabilities.ts"

export async function runCapabilityReportLines(locale: UiLocale): Promise<string[]> {
  const report = await probeCapabilities()
  return formatCapabilityReportLines(report, locale)
}
