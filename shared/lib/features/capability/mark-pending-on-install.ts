/**
 * EN: On extension install/update, queue capability report for the next prompt open.
 * JA: 拡張の install/update 時、次のプロンプトオープン用に能力レポートを予約する。
 */

import { markCapabilityReportPending } from "./pending-report.ts"

export async function markCapabilityReportPendingOnInstall(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  if (details.reason !== "install" && details.reason !== "update") {
    return
  }
  await markCapabilityReportPending()
}
