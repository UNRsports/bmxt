/**
 * EN: Apply a pasted/loaded RTC handshake code to the current wizard step.
 *     Kept outside the main controller so clipboard/file transports can call it
 *     without a circular import through sync-wizard-controller.
 * JA: 貼付／読込した RTC 握手コードを現行ウィザード工程へ適用する。
 *     clipboard／file 輸送が controller 経由の循環 import なしで呼べるよう分離。
 */

import { tCmd } from "../../setting/i18n/ns/cmd"
import {
  clearSyncConnectPending,
  getSyncConnectPending
} from "../handshake/common/sync-connect-pending.ts"
import { parseSyncSetupRtcPaste } from "../handshake/clipboard/rtc-paste.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { getSyncService } from "../facade/sync-service.ts"
import { waitForSyncLinkConnected } from "../link/sync-link-bridge.ts"
import {
  closeSyncWizardState,
  getSyncWizardState,
  patchSyncWizardState
} from "./sync-wizard-state.ts"
import type { SyncWizardLogSink } from "./sync-wizard-types.ts"

export function wizardFinish(sink: SyncWizardLogSink): void {
  clearSyncConnectPending()
  closeSyncWizardState()
  sink.focusPrompt()
}

export function cancelSyncWizard(sink: SyncWizardLogSink): void {
  clearSyncConnectPending()
  closeSyncWizardState()
  void sink.appendLogLines([tCmd("cmd.sync.setup.cancelled", sink.locale)])
  sink.focusPrompt()
}

export async function wizardSubmitRtc(sink: SyncWizardLogSink, raw: string): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.busy) {
    return
  }
  if (current.step !== "pasteOffer" && current.step !== "showOffer") {
    return
  }
  const parsed = parseSyncSetupRtcPaste(raw)
  if (parsed.kind === "cancel") {
    cancelSyncWizard(sink)
    return
  }
  if (parsed.kind === "invalid") {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.invalidRtcCode", sink.locale)
    })
    return
  }

  const asAnswerSide = current.step === "pasteOffer"
  patchSyncWizardState({ busy: true, banner: null })

  if (asAnswerSide) {
    const result = await getSyncService().answer(parsed.value)
    if (!result.ok) {
      const expanded = expandSyncLogLines(result.lines, sink.locale)
      patchSyncWizardState({
        busy: false,
        banner: expanded[0] ?? tCmd("cmd.sync.setup.invalidRtcCode", sink.locale)
      })
      return
    }
    const pending = getSyncConnectPending()
    const peerDeviceId =
      pending && pending.peerDeviceId !== "*"
        ? pending.peerDeviceId
        : current.peerDeviceId
    patchSyncWizardState({
      busy: false,
      step: "showAnswer",
      peerDisplayName: pending?.peerDisplayName ?? current.peerDisplayName,
      peerDeviceId,
      banner: tCmd("cmd.sync.wizard.bannerCopyAnswer", sink.locale)
    })
    // EN: Answer side finishes when the offerer accepts and the DataChannel maps connected.
    if (typeof peerDeviceId === "string" && peerDeviceId.length > 0) {
      void waitForSyncLinkConnected(peerDeviceId).then(async (ok) => {
        if (!ok) {
          return
        }
        const wizard = getSyncWizardState()
        if (!wizard.open) {
          return
        }
        await sink.appendLogLines([tCmd("cmd.sync.setup.done", sink.locale)])
        wizardFinish(sink)
      })
    }
    return
  }

  const result = await getSyncService().accept(parsed.value)
  const expanded = expandSyncLogLines(result.lines, sink.locale)
  if (!result.ok) {
    const spent = result.lines.includes("sync.rtc.acceptFailed")
    if (spent) {
      clearSyncConnectPending()
      patchSyncWizardState({
        busy: false,
        step: "done",
        banner: tCmd("cmd.sync.setup.acceptRetryHint", sink.locale)
      })
      await sink.appendLogLines(expanded)
      return
    }
    patchSyncWizardState({
      busy: false,
      banner: expanded[0] ?? tCmd("cmd.sync.setup.invalidRtcCode", sink.locale)
    })
    return
  }
  clearSyncConnectPending()
  await sink.appendLogLines(expanded)
  await sink.appendLogLines([tCmd("cmd.sync.setup.done", sink.locale)])
  wizardFinish(sink)
}
