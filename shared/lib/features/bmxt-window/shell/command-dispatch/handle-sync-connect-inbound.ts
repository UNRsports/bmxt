import { tCmd } from "../../../setting/i18n/ns/cmd"
import {
  clearSyncConnectPending,
  getSyncConnectPending
} from "../../../sync/connect/sync-connect-pending.ts"
import { expandSyncLogLines } from "../../../sync/facade/expand-sync-log.ts"
import { getSyncService } from "../../../sync/facade/sync-service.ts"
import {
  compactRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../../../sync/discovery/rtc-handshake-codec.ts"
import {
  isSyncSetupCancel,
  parseSyncSetupRtcPaste
} from "../../../sync/setup/sync-setup-pending.ts"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

function looksLikeHandshakePaste(raw: string): boolean {
  const compact = compactRtcHandshakeCode(raw)
  return compact.includes(RTC_HANDSHAKE_PREFIX)
}

/**
 * EN: While sync -connect awaits a peer code, accept a bare `bmxt-rtc1.…` paste at the prompt.
 * JA: sync -connect の待ち中は、プロンプトへの素の `bmxt-rtc1.…` 貼付を受理する。
 */
export function tryHandleSyncConnectInbound(
  ctx: CommandDispatchContext
): CommandDispatchResult {
  const pending = getSyncConnectPending()
  if (
    pending === null ||
    !pending.awaitingInbound ||
    pending.kind !== "handshake" ||
    pending.role === null
  ) {
    return "not_handled"
  }

  const { trimmed, deps, locale } = ctx
  if (isSyncSetupCancel(trimmed)) {
    clearPrompt(deps)
    recordCommandHistory(deps)
    clearSyncConnectPending()
    void deps.appendLogLines([
      `> ${trimmed}`,
      tCmd("cmd.sync.setup.cancelled", locale)
    ])
    deps.focusPrompt()
    return "handled"
  }

  if (!looksLikeHandshakePaste(trimmed)) {
    return "not_handled"
  }

  clearPrompt(deps)
  recordCommandHistory(deps)
  const logPrefix = `> ${trimmed}`
  const parsed = parseSyncSetupRtcPaste(trimmed)

  void (async () => {
    if (parsed.kind !== "value") {
      await deps.appendLogLines([
        logPrefix,
        tCmd("cmd.sync.setup.invalidRtcCode", locale),
        tCmd("cmd.sync.connect.pasteAtPrompt", locale)
      ])
      deps.focusPrompt()
      return
    }

    const result =
      pending.role === "answer"
        ? await getSyncService().answer(parsed.value)
        : await getSyncService().accept(parsed.value)
    await deps.appendLogLines([
      logPrefix,
      ...expandSyncLogLines(result.lines, locale)
    ])
    if (!result.ok && pending.role === "offer") {
      const spent = result.lines.includes("sync.rtc.acceptFailed")
      if (spent) {
        clearSyncConnectPending()
        await deps.appendLogLines([tCmd("cmd.sync.setup.acceptRetryHint", locale)])
      } else {
        await deps.appendLogLines([tCmd("cmd.sync.connect.pasteAtPrompt", locale)])
      }
    } else if (!result.ok) {
      await deps.appendLogLines([tCmd("cmd.sync.connect.pasteAtPrompt", locale)])
    }
    deps.focusPrompt()
  })()

  return "handled"
}
