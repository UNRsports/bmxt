import { tCmd } from "../../setting/i18n/ns/cmd"
import {
  clearSyncConnectPending,
  getSyncConnectPending
} from "../handshake/common/sync-connect-pending.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { loadSyncPickerSummary } from "../facade/sync-picker-summary.ts"
import { getSyncService } from "../facade/sync-service.ts"
import {
  closeSyncWizardState,
  getSyncWizardState,
  patchSyncWizardState,
  setSyncWizardBanner,
  setSyncWizardState,
  type SyncWizardState
} from "./sync-wizard-state.ts"
import {
  wizardBackClearsPending,
  wizardPreviousStep
} from "./sync-wizard-nav.ts"
import type { SyncWizardLogSink } from "./sync-wizard-types.ts"
import { wizardSubmitInvite } from "./sync-wizard-submit-invite.ts"
import {
  cancelSyncWizard,
  wizardFinish,
  wizardSubmitRtc
} from "./sync-wizard-submit-rtc.ts"

export { wizardCanGoBack } from "./sync-wizard-nav.ts"

export type { SyncWizardLogSink } from "./sync-wizard-types.ts"
export {
  cancelSyncWizard,
  wizardFinish,
  wizardSubmitRtc
} from "./sync-wizard-submit-rtc.ts"
export { wizardSubmitInvite } from "./sync-wizard-submit-invite.ts"
export { wizardCopyOutbound } from "../handshake/clipboard/wizard-clipboard.ts"
export {
  wizardLoadInviteFile,
  wizardLoadRtcFile,
  wizardSaveOutboundHandshakeFile,
  wizardSaveOutboundInviteFile
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

function openState(
  partial: Omit<
    SyncWizardState,
    "open" | "busy" | "banner" | "bannerKind" | "handshakeTransport"
  > & {
    banner?: string | null
  }
): void {
  const banner = partial.banner ?? null
  setSyncWizardState({
    open: true,
    busy: false,
    banner,
    bannerKind: "info",
    mode: partial.mode,
    step: partial.step,
    hasFamily: partial.hasFamily,
    peerDisplayName: partial.peerDisplayName,
    peerDeviceId: partial.peerDeviceId,
    handshakeTransport: null
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
  setSyncWizardBanner(null, "info", { busy: true })
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
    setSyncWizardBanner(tCmd("cmd.sync.wizard.bannerPasteInvite", sink.locale), "info", {
      step: "joinInvite"
    })
    return
  }
  if (choice === "continue") {
    setSyncWizardBanner(null, "info", {
      step: "role",
      hasFamily: true
    })
    return
  }
  setSyncWizardBanner(null, "info", { busy: true })
  const result = await getSyncService().pair("")
  if (!result.ok) {
    setSyncWizardBanner(tCmd("cmd.sync.setup.retryFamily", sink.locale), "warning", {
      busy: false
    })
    return
  }
  setSyncWizardBanner(tCmd("cmd.sync.wizard.bannerCopyInvite", sink.locale), "info", {
    busy: false,
    step: "showInvite",
    hasFamily: true
  })
}

export function wizardContinueAfterInvite(): void {
  const current = getSyncWizardState()
  if (!current.open || current.step !== "showInvite" || current.busy) {
    return
  }
  clearSyncConnectPending()
  setSyncWizardBanner(null, "info", {
    step: "role"
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
    setSyncWizardBanner(
      tCmd("cmd.sync.wizard.bannerPasteOfferGeneric", sink.locale),
      "info",
      { step: "pasteOffer" }
    )
    return
  }
  setSyncWizardBanner(null, "info", { busy: true })
  const result = await getSyncService().offer()
  if (!result.ok) {
    const expanded = expandSyncLogLines(result.lines, sink.locale)
    setSyncWizardBanner(
      expanded[0] ?? tCmd("cmd.sync.rtc.encodeFailed", sink.locale),
      "warning",
      { busy: false }
    )
    return
  }
  setSyncWizardBanner(tCmd("cmd.sync.wizard.bannerCopyOfferGeneric", sink.locale), "info", {
    busy: false,
    step: "showOffer"
  })
}

/** EN: Outbound code currently held for COPY (invite or handshake). */
export function wizardOutboundCode(): string | null {
  return getSyncConnectPending()?.outboundCode ?? null
}

/**
 * EN: Return to the previous choice step (family / role / pasteOffer), clearing outbound pending.
 * JA: 直前の選択肢へ戻る。保持中の outbound 握手コードは破棄する。
 */
export function wizardGoBack(sink: SyncWizardLogSink): void {
  const current = getSyncWizardState()
  const previous = wizardPreviousStep(current)
  if (previous === null) {
    return
  }

  if (wizardBackClearsPending(current.step)) {
    clearSyncConnectPending()
  }

  let banner: string | null = null
  if (previous === "pasteOffer") {
    if (current.mode === "connect" && current.peerDisplayName !== null) {
      banner = tCmd("cmd.sync.wizard.bannerPasteOffer", sink.locale, {
        name: current.peerDisplayName
      })
    } else {
      banner = tCmd("cmd.sync.wizard.bannerPasteOfferGeneric", sink.locale)
    }
  }

  setSyncWizardBanner(banner, "info", {
    step: previous,
    busy: false
  })
}
