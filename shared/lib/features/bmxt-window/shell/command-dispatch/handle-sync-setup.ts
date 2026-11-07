import { tCmd } from "../../../setting/i18n/ns/cmd"
import {
  clearSyncConnectPending,
  setSyncConnectPending
} from "../../../sync/connect/sync-connect-pending.ts"
import { expandSyncLogLines } from "../../../sync/facade/expand-sync-log.ts"
import { loadSyncPickerSummary } from "../../../sync/facade/sync-picker-summary.ts"
import { getSyncService } from "../../../sync/facade/sync-service.ts"
import {
  parseSyncSetupFamilyChoice,
  parseSyncSetupInvitePaste,
  parseSyncSetupRoleChoice,
  parseSyncSetupRtcPaste,
  type SyncSetupPending
} from "../../../sync/setup/sync-setup-pending.ts"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

function familyPromptLines(locale: CommandDispatchContext["locale"], hasFamily: boolean): string[] {
  const lines = [
    tCmd("cmd.sync.setup.family.intro", locale),
    tCmd("cmd.sync.setup.family.create", locale),
    tCmd("cmd.sync.setup.family.join", locale)
  ]
  if (hasFamily) {
    lines.push(tCmd("cmd.sync.setup.family.continue", locale))
  }
  lines.push(tCmd("cmd.sync.setup.cancelHint", locale))
  return lines
}

function rolePromptLines(locale: CommandDispatchContext["locale"]): string[] {
  return [
    tCmd("cmd.sync.setup.role.intro", locale),
    tCmd("cmd.sync.setup.role.offer", locale),
    tCmd("cmd.sync.setup.role.answer", locale),
    tCmd("cmd.sync.setup.cancelHint", locale)
  ]
}

async function appendExpanded(
  ctx: CommandDispatchContext,
  prefix: string,
  lines: string[]
): Promise<void> {
  await ctx.deps.appendLogLines([prefix, ...expandSyncLogLines(lines, ctx.locale)])
}

export function beginSyncSetup(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  clearPrompt(ctx.deps)
  recordCommandHistory(ctx.deps)
  clearSyncConnectPending()
  void (async () => {
    const summary = await loadSyncPickerSummary()
    const hasFamily = summary.familyId !== null
    ctx.deps.syncSetupPendingRef.current = { step: "family", hasFamily }
    await ctx.deps.appendLogLines([
      `> ${ctx.trimmed}`,
      tCmd("cmd.sync.setup.started", ctx.locale),
      ...familyPromptLines(ctx.locale, hasFamily)
    ])
    ctx.deps.focusPrompt()
  })()
}

export function tryHandleSyncSetup(ctx: CommandDispatchContext): CommandDispatchResult {
  const pendingRef = ctx.deps.syncSetupPendingRef
  const pending = pendingRef.current
  if (!pending) {
    return "not_handled"
  }

  const { deps, trimmed, locale } = ctx
  clearPrompt(deps)
  recordCommandHistory(deps)
  const logPrefix = `> ${trimmed}`

  void (async () => {
    if (pending.step === "family") {
      await handleFamilyStep(ctx, pending, logPrefix)
      return
    }
    if (pending.step === "joinInvite") {
      await handleJoinInviteStep(ctx, pending, logPrefix)
      return
    }
    if (pending.step === "role") {
      await handleRoleStep(ctx, pending, logPrefix)
      return
    }
    if (pending.step === "pasteOffer") {
      await handlePasteOfferStep(ctx, logPrefix)
      return
    }
    if (pending.step === "pasteAnswer") {
      await handlePasteAnswerStep(ctx, logPrefix)
      return
    }
    pendingRef.current = null
    clearSyncConnectPending()
    await deps.appendLogLines([logPrefix, tCmd("cmd.sync.setup.cancelled", locale)])
    deps.focusPrompt()
  })()

  deps.focusPrompt()
  return "handled"
}

async function handleFamilyStep(
  ctx: CommandDispatchContext,
  pending: SyncSetupPending,
  logPrefix: string
): Promise<void> {
  const choice = parseSyncSetupFamilyChoice(ctx.trimmed, pending.hasFamily)
  if (choice === "invalid") {
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.invalidChoice", ctx.locale),
      ...familyPromptLines(ctx.locale, pending.hasFamily)
    ])
    ctx.deps.focusPrompt()
    return
  }
  if (choice === "cancel") {
    ctx.deps.syncSetupPendingRef.current = null
    clearSyncConnectPending()
    await ctx.deps.appendLogLines([logPrefix, tCmd("cmd.sync.setup.cancelled", ctx.locale)])
    ctx.deps.focusPrompt()
    return
  }
  if (choice === "join") {
    ctx.deps.syncSetupPendingRef.current = { step: "joinInvite", hasFamily: pending.hasFamily }
    setSyncConnectPending({
      kind: "invite",
      peerDeviceId: "*",
      peerDisplayName: "Family",
      role: null,
      outboundCode: null,
      awaitingInbound: true
    })
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.joinPrompt", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  if (choice === "create") {
    const result = await getSyncService().pair("")
    await appendExpanded(ctx, logPrefix, result.lines)
    if (!result.ok) {
      await ctx.deps.appendLogLines([
        tCmd("cmd.sync.setup.retryFamily", ctx.locale),
        ...familyPromptLines(ctx.locale, pending.hasFamily)
      ])
      ctx.deps.focusPrompt()
      return
    }
    ctx.deps.syncSetupPendingRef.current = { step: "role", hasFamily: true }
    await ctx.deps.appendLogLines([
      tCmd("cmd.sync.setup.familyReady", ctx.locale),
      ...rolePromptLines(ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  // continue
  ctx.deps.syncSetupPendingRef.current = { step: "role", hasFamily: true }
  await ctx.deps.appendLogLines([logPrefix, ...rolePromptLines(ctx.locale)])
  ctx.deps.focusPrompt()
}

async function handleJoinInviteStep(
  ctx: CommandDispatchContext,
  pending: SyncSetupPending,
  logPrefix: string
): Promise<void> {
  const parsed = parseSyncSetupInvitePaste(ctx.trimmed)
  if (parsed.kind === "cancel") {
    ctx.deps.syncSetupPendingRef.current = { step: "family", hasFamily: pending.hasFamily }
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.backToFamily", ctx.locale),
      ...familyPromptLines(ctx.locale, pending.hasFamily)
    ])
    ctx.deps.focusPrompt()
    return
  }
  if (parsed.kind === "invalid") {
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.invalidInvite", ctx.locale),
      tCmd("cmd.sync.setup.joinPrompt", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  const result = await getSyncService().pair(parsed.value)
  await appendExpanded(ctx, logPrefix, result.lines)
  if (!result.ok) {
    await ctx.deps.appendLogLines([
      tCmd("cmd.sync.setup.joinPrompt", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  clearSyncConnectPending()
  ctx.deps.syncSetupPendingRef.current = { step: "role", hasFamily: true }
  await ctx.deps.appendLogLines([
    tCmd("cmd.sync.setup.familyReadyJoined", ctx.locale),
    ...rolePromptLines(ctx.locale)
  ])
  ctx.deps.focusPrompt()
}

async function handleRoleStep(
  ctx: CommandDispatchContext,
  pending: SyncSetupPending,
  logPrefix: string
): Promise<void> {
  const choice = parseSyncSetupRoleChoice(ctx.trimmed)
  if (choice === "invalid") {
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.invalidChoice", ctx.locale),
      ...rolePromptLines(ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  if (choice === "cancel") {
    ctx.deps.syncSetupPendingRef.current = null
    clearSyncConnectPending()
    await ctx.deps.appendLogLines([logPrefix, tCmd("cmd.sync.setup.cancelled", ctx.locale)])
    ctx.deps.focusPrompt()
    return
  }
  if (choice === "answer") {
    ctx.deps.syncSetupPendingRef.current = {
      step: "pasteOffer",
      hasFamily: pending.hasFamily
    }
    setSyncConnectPending({
      kind: "handshake",
      peerDeviceId: "*",
      peerDisplayName: "peer",
      role: "answer",
      outboundCode: null,
      awaitingInbound: true
    })
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.pasteOffer", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  const result = await getSyncService().offer()
  await appendExpanded(ctx, logPrefix, result.lines)
  if (!result.ok) {
    await ctx.deps.appendLogLines([...rolePromptLines(ctx.locale)])
    ctx.deps.focusPrompt()
    return
  }
  ctx.deps.syncSetupPendingRef.current = {
    step: "pasteAnswer",
    hasFamily: pending.hasFamily
  }
  await ctx.deps.appendLogLines([
    tCmd("cmd.sync.setup.offerReady", ctx.locale),
    tCmd("cmd.sync.setup.pasteAnswer", ctx.locale),
    tCmd("cmd.sync.setup.cancelHint", ctx.locale)
  ])
  ctx.deps.focusPrompt()
}

async function handlePasteOfferStep(
  ctx: CommandDispatchContext,
  logPrefix: string
): Promise<void> {
  const parsed = parseSyncSetupRtcPaste(ctx.trimmed)
  if (parsed.kind === "cancel") {
    ctx.deps.syncSetupPendingRef.current = null
    clearSyncConnectPending()
    await ctx.deps.appendLogLines([logPrefix, tCmd("cmd.sync.setup.cancelled", ctx.locale)])
    ctx.deps.focusPrompt()
    return
  }
  if (parsed.kind === "invalid") {
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.invalidRtcCode", ctx.locale),
      tCmd("cmd.sync.setup.pasteOffer", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  const result = await getSyncService().answer(parsed.value)
  await appendExpanded(ctx, logPrefix, result.lines)
  if (!result.ok) {
    await ctx.deps.appendLogLines([
      tCmd("cmd.sync.setup.pasteOffer", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  ctx.deps.syncSetupPendingRef.current = null
  await ctx.deps.appendLogLines([tCmd("cmd.sync.setup.answerReady", ctx.locale)])
  ctx.deps.focusPrompt()
}

async function handlePasteAnswerStep(
  ctx: CommandDispatchContext,
  logPrefix: string
): Promise<void> {
  const parsed = parseSyncSetupRtcPaste(ctx.trimmed)
  if (parsed.kind === "cancel") {
    ctx.deps.syncSetupPendingRef.current = null
    clearSyncConnectPending()
    await ctx.deps.appendLogLines([logPrefix, tCmd("cmd.sync.setup.cancelled", ctx.locale)])
    ctx.deps.focusPrompt()
    return
  }
  if (parsed.kind === "invalid") {
    await ctx.deps.appendLogLines([
      logPrefix,
      tCmd("cmd.sync.setup.invalidRtcCode", ctx.locale),
      tCmd("cmd.sync.setup.pasteAnswer", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  const result = await getSyncService().accept(parsed.value)
  await appendExpanded(ctx, logPrefix, result.lines)
  if (!result.ok) {
    // EN: Re-pasting a spent answer code cannot succeed; end the wizard instead of looping.
    const spent = result.lines.includes("sync.rtc.acceptFailed")
    if (spent) {
      ctx.deps.syncSetupPendingRef.current = null
      await ctx.deps.appendLogLines([tCmd("cmd.sync.setup.acceptRetryHint", ctx.locale)])
      ctx.deps.focusPrompt()
      return
    }
    await ctx.deps.appendLogLines([
      tCmd("cmd.sync.setup.pasteAnswer", ctx.locale),
      tCmd("cmd.sync.setup.cancelHint", ctx.locale)
    ])
    ctx.deps.focusPrompt()
    return
  }
  ctx.deps.syncSetupPendingRef.current = null
  await ctx.deps.appendLogLines([tCmd("cmd.sync.setup.done", ctx.locale)])
  ctx.deps.focusPrompt()
}
