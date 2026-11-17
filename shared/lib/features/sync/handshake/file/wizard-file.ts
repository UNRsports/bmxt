/**
 * EN: Wizard actions that use the handshake ticket-file transport.
 * JA: 握手チケットファイル輸送を使うウィザード操作。
 */

import { tCmd } from "../../../setting/i18n/ns/cmd"
import {
  getSyncWizardState,
  patchSyncWizardState,
  type SyncWizardStep
} from "../../wizard/sync-wizard-state.ts"
import { wizardSubmitRtc } from "../../wizard/sync-wizard-submit-rtc.ts"
import type { SyncWizardLogSink } from "../../wizard/sync-wizard-types.ts"
import { getSyncConnectPending } from "../common/sync-connect-pending.ts"
import {
  downloadRtcHandshakeFile,
  parseRtcHandshakeFileText,
  type RtcHandshakeFileRole
} from "./rtc-handshake-file.ts"

function expectedInboundRtcRole(step: SyncWizardStep): RtcHandshakeFileRole | null {
  if (step === "pasteOffer") {
    return "offer"
  }
  if (step === "showOffer") {
    return "answer"
  }
  return null
}

function outboundHandshakeRole(
  step: SyncWizardStep,
  pendingRole: RtcHandshakeFileRole | null | undefined
): RtcHandshakeFileRole | null {
  if (pendingRole === "offer" || pendingRole === "answer") {
    return pendingRole
  }
  if (step === "showOffer") {
    return "offer"
  }
  if (step === "showAnswer") {
    return "answer"
  }
  return null
}

/**
 * EN: Download the pending RTC handshake as a timestamped ticket file.
 * JA: 保留中の RTC 握手をタイムスタンプ付きチケットファイルとしてダウンロード。
 */
export function wizardSaveOutboundHandshakeFile(sink: SyncWizardLogSink): { ok: boolean } {
  const current = getSyncWizardState()
  if (!current.open || current.busy) {
    return { ok: false }
  }
  const pending = getSyncConnectPending()
  if (pending === null || pending.kind !== "handshake" || pending.outboundCode === null) {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.saveFileFailed", sink.locale)
    })
    return { ok: false }
  }
  const role = outboundHandshakeRole(current.step, pending.role)
  if (role === null) {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.saveFileFailed", sink.locale)
    })
    return { ok: false }
  }
  const filename = downloadRtcHandshakeFile({
    role,
    code: pending.outboundCode
  })
  if (filename === null) {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.saveFileFailed", sink.locale)
    })
    return { ok: false }
  }
  patchSyncWizardState({
    banner: tCmd("cmd.sync.wizard.savedFile", sink.locale, {
      name: filename
    })
  })
  return { ok: true }
}

/**
 * EN: Load an offer/answer handshake file and continue the RTC wizard step.
 * JA: offer/answer 握手ファイルを読み込み、RTC ウィザード工程を続行する。
 */
export async function wizardLoadRtcFile(
  sink: SyncWizardLogSink,
  fileText: string
): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.busy) {
    return
  }
  const expectedRole = expectedInboundRtcRole(current.step)
  if (expectedRole === null) {
    return
  }
  const parsed = parseRtcHandshakeFileText(fileText)
  if (!parsed.ok) {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.invalidHandshakeFile", sink.locale)
    })
    return
  }
  if (parsed.role !== null && parsed.role !== expectedRole) {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.wrongHandshakeFileRole", sink.locale, {
        expected: expectedRole,
        actual: parsed.role
      })
    })
    return
  }
  await wizardSubmitRtc(sink, parsed.code)
}
