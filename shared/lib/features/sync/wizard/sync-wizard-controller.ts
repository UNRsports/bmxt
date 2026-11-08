import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import {
  clearSyncConnectPending,
  getSyncConnectPending
} from "../connect/sync-connect-pending.ts"
import { copySyncHandshakeCode } from "../connect/sync-handshake-actions.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { loadSyncPickerSummary } from "../facade/sync-picker-summary.ts"
import { getSyncService } from "../facade/sync-service.ts"
import {
  parseSyncSetupInvitePaste,
  parseSyncSetupRtcPaste
} from "../setup/sync-setup-pending.ts"
import {
  closeSyncWizardState,
  getSyncWizardState,
  patchSyncWizardState,
  setSyncWizardState,
  type SyncWizardState
} from "./sync-wizard-state.ts"

export type SyncWizardLogSink = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}

async function appendShort(
  sink: SyncWizardLogSink,
  commandLine: string | null,
  tokens: string[]
): Promise<void> {
  const expanded = expandSyncLogLines(tokens, sink.locale)
  if (commandLine !== null) {
    await sink.appendLogLines([`> ${commandLine}`, ...expanded])
  } else {
    await sink.appendLogLines(expanded)
  }
}

function openState(partial: Omit<SyncWizardState, "open" | "busy" | "banner"> & {
  banner?: string | null
}): void {
  setSyncWizardState({
    open: true,
    busy: false,
    banner: partial.banner ?? null,
    mode: partial.mode,
    step: partial.step,
    hasFamily: partial.hasFamily,
    peerDisplayName: partial.peerDisplayName,
    peerDeviceId: partial.peerDeviceId
  })
}

/** EN: Start guided Family + handshake setup (`sync -setup`). */
export async function openSyncWizardSetup(sink: SyncWizardLogSink, commandLine: string): Promise<void> {
  clearSyncConnectPending()
  const summary = await loadSyncPickerSummary()
  const hasFamily = summary.familyId !== null
  await appendShort(sink, commandLine, [])
  await sink.appendLogLines([tCmd("cmd.sync.wizard.openedSetup", sink.locale)])
  openState({
    mode: "setup",
    step: "family",
    hasFamily,
    peerDisplayName: null,
    peerDeviceId: null
  })
}

/**
 * EN: Start reconnect wizard for a roster peer (`sync -connect`).
 * JA: 名簿ピアへの再接続ウィザードを開く。
 */
export async function openSyncWizardConnect(
  sink: SyncWizardLogSink,
  commandLine: string,
  deviceId: string
): Promise<void> {
  patchSyncWizardState({ busy: true, banner: null })
  const result = await getSyncService().connect(deviceId)
  await appendShort(sink, commandLine, result.lines)
  if (!result.ok || result.alreadyConnected === true) {
    closeSyncWizardState()
    sink.focusPrompt()
    return
  }
  const session = result.session
  if (session === null || session === undefined) {
    closeSyncWizardState()
    sink.focusPrompt()
    return
  }
  if (session.role === "offer") {
    openState({
      mode: "connect",
      step: "showOffer",
      hasFamily: true,
      peerDisplayName: session.peerDisplayName,
      peerDeviceId: session.peerDeviceId === "*" ? null : session.peerDeviceId,
      banner: tCmd("cmd.sync.wizard.bannerCopyOffer", sink.locale, {
        name: session.peerDisplayName
      })
    })
    return
  }
  openState({
    mode: "connect",
    step: "pasteOffer",
    hasFamily: true,
    peerDisplayName: session.peerDisplayName,
    peerDeviceId: session.peerDeviceId === "*" ? null : session.peerDeviceId,
    banner: tCmd("cmd.sync.wizard.bannerPasteOffer", sink.locale, {
      name: session.peerDisplayName
    })
  })
}

export function cancelSyncWizard(sink: SyncWizardLogSink): void {
  clearSyncConnectPending()
  closeSyncWizardState()
  void sink.appendLogLines([tCmd("cmd.sync.setup.cancelled", sink.locale)])
  sink.focusPrompt()
}

export function closeSyncWizardQuiet(sink: SyncWizardLogSink): void {
  closeSyncWizardState()
  sink.focusPrompt()
}

export async function wizardChooseFamily(
  sink: SyncWizardLogSink,
  choice: "create" | "join" | "continue"
): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "family" || current.busy) {
    return
  }
  if (choice === "join") {
    patchSyncWizardState({
      step: "joinInvite",
      banner: tCmd("cmd.sync.wizard.bannerPasteInvite", sink.locale)
    })
    return
  }
  if (choice === "continue") {
    patchSyncWizardState({
      step: "role",
      hasFamily: true,
      banner: null
    })
    return
  }
  patchSyncWizardState({ busy: true, banner: null })
  const result = await getSyncService().pair("")
  if (!result.ok) {
    patchSyncWizardState({
      busy: false,
      banner: tCmd("cmd.sync.setup.retryFamily", sink.locale)
    })
    return
  }
  patchSyncWizardState({
    busy: false,
    step: "showInvite",
    hasFamily: true,
    banner: tCmd("cmd.sync.wizard.bannerCopyInvite", sink.locale)
  })
}

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

export function wizardContinueAfterInvite(): void {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "showInvite" || current.busy) {
    return
  }
  clearSyncConnectPending()
  patchSyncWizardState({
    step: "role",
    banner: null
  })
}

export async function wizardChooseRole(
  sink: SyncWizardLogSink,
  choice: "offer" | "answer"
): Promise<void> {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "role" || current.busy) {
    return
  }
  if (choice === "answer") {
    patchSyncWizardState({
      step: "pasteOffer",
      banner: tCmd("cmd.sync.wizard.bannerPasteOfferGeneric", sink.locale)
    })
    return
  }
  patchSyncWizardState({ busy: true, banner: null })
  const result = await getSyncService().offer()
  if (!result.ok) {
    const expanded = expandSyncLogLines(result.lines, sink.locale)
    patchSyncWizardState({
      busy: false,
      banner: expanded[0] ?? tCmd("cmd.sync.rtc.encodeFailed", sink.locale)
    })
    return
  }
  patchSyncWizardState({
    busy: false,
    step: "showOffer",
    banner: tCmd("cmd.sync.wizard.bannerCopyOfferGeneric", sink.locale)
  })
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
    patchSyncWizardState({
      busy: false,
      step: "showAnswer",
      peerDisplayName: pending?.peerDisplayName ?? current.peerDisplayName,
      peerDeviceId:
        pending && pending.peerDeviceId !== "*"
          ? pending.peerDeviceId
          : current.peerDeviceId,
      banner: tCmd("cmd.sync.wizard.bannerCopyAnswer", sink.locale)
    })
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
  patchSyncWizardState({
    busy: false,
    step: "done",
    banner: tCmd("cmd.sync.setup.done", sink.locale)
  })
}

export async function wizardCopyOutbound(
  sink: SyncWizardLogSink
): Promise<{ ok: boolean }> {
  const result = await copySyncHandshakeCode()
  if (result.ok) {
    patchSyncWizardState({
      banner: tCmd(
        getSyncConnectPending()?.kind === "invite"
          ? "cmd.sync.wizard.copiedInvite"
          : "cmd.sync.wizard.copied",
        sink.locale
      )
    })
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
  patchSyncWizardState({
    banner: expanded[0] ?? tCmd("cmd.sync.connect.clipboardWriteFailed", sink.locale)
  })
  return { ok: false }
}

export function wizardFinish(sink: SyncWizardLogSink): void {
  clearSyncConnectPending()
  closeSyncWizardState()
  sink.focusPrompt()
}

/** EN: Outbound code currently held for COPY (invite or handshake). */
export function wizardOutboundCode(): string | null {
  return getSyncConnectPending()?.outboundCode ?? null
}
