import { tCmd } from "../../setting/i18n/ns/cmd"
import {
  clearSyncConnectPending,
  getSyncConnectPending
} from "../handshake/common/sync-connect-pending.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { loadSyncPickerSummary } from "../facade/sync-picker-summary.ts"
import { getSyncService } from "../facade/sync-service.ts"
import { parseSyncSetupInvitePaste } from "../setup/sync-setup-pending.ts"
import {
  closeSyncWizardState,
  getSyncWizardState,
  patchSyncWizardState,
  setSyncWizardState,
  type SyncWizardState
} from "./sync-wizard-state.ts"
import type { SyncWizardLogSink } from "./sync-wizard-types.ts"
import {
  cancelSyncWizard,
  wizardFinish,
  wizardSubmitRtc
} from "./sync-wizard-submit-rtc.ts"

export type { SyncWizardLogSink } from "./sync-wizard-types.ts"
export {
  cancelSyncWizard,
  wizardFinish,
  wizardSubmitRtc
} from "./sync-wizard-submit-rtc.ts"
export { wizardCopyOutbound } from "../handshake/clipboard/wizard-clipboard.ts"
export {
  wizardLoadRtcFile,
  wizardSaveOutboundHandshakeFile
} from "../handshake/file/wizard-file.ts"

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

/** EN: Outbound code currently held for COPY (invite or handshake). */
export function wizardOutboundCode(): string | null {
  return getSyncConnectPending()?.outboundCode ?? null
}
