/**
 * EN: Wizard actions that use the clipboard transport.
 * JA: clipboard 輸送を使うウィザード操作。
 */

import { tCmd } from "../../../setting/i18n/ns/cmd"
import { expandSyncLogLines } from "../../facade/expand-sync-log.ts"
import {
  getSyncWizardState,
  setSyncWizardBanner
} from "../../wizard/sync-wizard-state.ts"
import type { SyncWizardLogSink } from "../../wizard/sync-wizard-types.ts"
import { getSyncConnectPending } from "../common/sync-connect-pending.ts"
import { copySyncHandshakeCode } from "./sync-handshake-actions.ts"

export async function wizardCopyOutbound(
  sink: SyncWizardLogSink
): Promise<{ ok: boolean }> {
  const current = getSyncWizardState()
  if (!current.open) {
    return { ok: false }
  }
  const result = await copySyncHandshakeCode()
  if (result.ok) {
    setSyncWizardBanner(
      tCmd(
        getSyncConnectPending()?.kind === "invite"
          ? "cmd.sync.wizard.copiedInvite"
          : "cmd.sync.wizard.copied",
        sink.locale
      ),
      "info"
    )
    return { ok: true }
  }
  const expanded = expandSyncLogLines(result.lines, sink.locale)
  // EN: Clipboard failure may include a last-resort dump token — keep that in the log only.
  const dump = result.lines.find(
    (t) => t.startsWith("sync.rtc.code:") || t.startsWith("sync.pair.invite:")
  )
  if (dump !== undefined) {
    await sink.appendLogLines(expanded)
  }
  setSyncWizardBanner(
    expanded[0] ?? tCmd("cmd.sync.connect.clipboardWriteFailed", sink.locale),
    "warning"
  )
  return { ok: false }
}
