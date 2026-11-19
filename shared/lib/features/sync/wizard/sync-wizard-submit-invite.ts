/**
 * EN: Apply a pasted/loaded Family invite token in the wizard.
 * JA: ウィザードで貼付／読込した Family 招待トークンを適用する。
 */

import { tCmd } from "../../setting/i18n/ns/cmd"
import { clearSyncConnectPending } from "../handshake/common/sync-connect-pending.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { getSyncService } from "../facade/sync-service.ts"
import { parseSyncSetupInvitePaste } from "../setup/sync-setup-pending.ts"
import {
  getSyncWizardState,
  setSyncWizardBanner
} from "./sync-wizard-state.ts"
import type { SyncWizardLogSink } from "./sync-wizard-types.ts"

export async function wizardSubmitInvite(sink: SyncWizardLogSink, raw: string): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "joinInvite" || current.busy) {
    return
  }
  const parsed = parseSyncSetupInvitePaste(raw)
  if (parsed.kind === "cancel") {
    setSyncWizardBanner(null, "info", {
      step: "family"
    })
    return
  }
  if (parsed.kind === "invalid") {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.invalidInvite", sink.locale), "warning")
    return
  }
  setSyncWizardBanner(null, "info", { busy: true })
  const result = await getSyncService().pair(parsed.value)
  if (!result.ok) {
    const expanded = expandSyncLogLines(result.lines, sink.locale)
    setSyncWizardBanner(
      expanded[0] ?? tCmd("cmd.sync.pair.joinFailed", sink.locale),
      "warning",
      { busy: false }
    )
    return
  }
  clearSyncConnectPending()
  setSyncWizardBanner(tCmd("cmd.sync.setup.familyReadyJoined", sink.locale), "info", {
    busy: false,
    step: "role",
    hasFamily: true
  })
}
