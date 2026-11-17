/**
 * EN: Apply a pasted/loaded Family invite token in the wizard.
 * JA: ウィザードで貼付／読込した Family 招待トークンを適用する。
 */

import { tCmd } from "../../setting/i18n/ns/cmd"
import { clearSyncConnectPending } from "../handshake/common/sync-connect-pending.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { getSyncService } from "../facade/sync-service.ts"
import { parseSyncSetupInvitePaste } from "../setup/sync-setup-pending.ts"
import { getSyncWizardState, patchSyncWizardState } from "./sync-wizard-state.ts"
import type { SyncWizardLogSink } from "./sync-wizard-types.ts"

export async function wizardSubmitInvite(sink: SyncWizardLogSink, raw: string): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "joinInvite" || current.busy) {
    return
  }
  const parsed = parseSyncSetupInvitePaste(raw)
  if (parsed.kind === "cancel") {
    patchSyncWizardState({
      step: "family",
      banner: null
    })
    return
  }
  if (parsed.kind === "invalid") {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.invalidInvite", sink.locale)
    })
    return
  }
  patchSyncWizardState({ busy: true, banner: null })
  const result = await getSyncService().pair(parsed.value)
  if (!result.ok) {
    const expanded = expandSyncLogLines(result.lines, sink.locale)
    patchSyncWizardState({
      busy: false,
      banner: expanded[0] ?? tCmd("cmd.sync.pair.joinFailed", sink.locale)
    })
    return
  }
  clearSyncConnectPending()
  patchSyncWizardState({
    busy: false,
    step: "role",
    hasFamily: true,
    banner: tCmd("cmd.sync.setup.familyReadyJoined", sink.locale)
  })
}
