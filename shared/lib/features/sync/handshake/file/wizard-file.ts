/**
 * EN: Wizard actions that use the ticket-file transport (invite + RTC).
 * JA: チケットファイル輸送（招待 + RTC）を使うウィザード操作。
 */

import { tCmd } from "../../../setting/i18n/ns/cmd"
import {
  getSyncWizardState,
  setSyncWizardBanner,
  type SyncWizardStep
} from "../../wizard/sync-wizard-state.ts"
import { wizardSubmitInvite } from "../../wizard/sync-wizard-submit-invite.ts"
import { wizardSubmitRtc } from "../../wizard/sync-wizard-submit-rtc.ts"
import type { SyncWizardLogSink } from "../../wizard/sync-wizard-types.ts"
import { getSyncConnectPending } from "../common/sync-connect-pending.ts"
import {
  downloadFamilyInviteFile,
  parseFamilyInviteFileText
} from "./invite-file.ts"
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
 * EN: Download the pending Family invite as a timestamped ticket file.
 * JA: 保留中の Family 招待をタイムスタンプ付きチケットファイルとしてダウンロード。
 */
export function wizardSaveOutboundInviteFile(sink: SyncWizardLogSink): { ok: boolean } {
  const current = getSyncWizardState()
  if (!current.open || current.busy) {
    return { ok: false }
  }
  const pending = getSyncConnectPending()
  if (pending === null || pending.kind !== "invite" || pending.outboundCode === null) {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.saveFileFailed", sink.locale), "warning")
    return { ok: false }
  }
  const filename = downloadFamilyInviteFile({ code: pending.outboundCode })
  if (filename === null) {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.saveFileFailed", sink.locale), "warning")
    return { ok: false }
  }
  setSyncWizardBanner(
    tCmd("cmd.sync.wizard.savedFile", sink.locale, {
      name: filename
    }),
    "info"
  )
  return { ok: true }
}

/**
 * EN: Load a Family invite ticket and continue the join step.
 * JA: Family 招待チケットを読み込み、参加工程を続行する。
 */
export async function wizardLoadInviteFile(
  sink: SyncWizardLogSink,
  fileText: string
): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.busy || current.step !== "joinInvite") {
    return
  }
  const parsed = parseFamilyInviteFileText(fileText)
  if (!parsed.ok) {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.invalidInviteFile", sink.locale), "warning")
    return
  }
  await wizardSubmitInvite(sink, parsed.code)
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
    setSyncWizardBanner(tCmd("cmd.sync.wizard.saveFileFailed", sink.locale), "warning")
    return { ok: false }
  }
  const role = outboundHandshakeRole(current.step, pending.role)
  if (role === null) {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.saveFileFailed", sink.locale), "warning")
    return { ok: false }
  }
  const filename = downloadRtcHandshakeFile({
    role,
    code: pending.outboundCode
  })
  if (filename === null) {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.saveFileFailed", sink.locale), "warning")
    return { ok: false }
  }
  setSyncWizardBanner(
    tCmd("cmd.sync.wizard.savedFile", sink.locale, {
      name: filename
    }),
    "info"
  )
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
    setSyncWizardBanner(tCmd("cmd.sync.wizard.invalidHandshakeFile", sink.locale), "warning")
    return
  }
  if (parsed.role !== null && parsed.role !== expectedRole) {
    setSyncWizardBanner(
      tCmd("cmd.sync.wizard.wrongHandshakeFileRole", sink.locale, {
        expected: expectedRole,
        actual: parsed.role
      }),
      "warning"
    )
    return
  }
  await wizardSubmitRtc(sink, parsed.code)
}
