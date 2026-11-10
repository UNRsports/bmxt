import { segmentFailure, segmentSuccess } from "../../command-line/compound/classify-outcome"
import type { SegmentOutcome } from "../../command-line/compound/types"
import type { UiLocale } from "../../setting/locale"
import {
  closeLocalTabsByIds,
  resolveLocalTabIdsByUrls,
  tabIdsForOpenedUrls
} from "../bus/close-local-after-open.ts"
import { parseOpenPayload } from "../bus/parse-open-payload.ts"
import { expandSyncLogLines } from "./expand-sync-log"
import { formatSyncStatusLines } from "./format-status"
import { getSyncService } from "./sync-service.ts"

export type SyncUiLogSink = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}

async function runAndLog(
  sink: SyncUiLogSink,
  commandLine: string,
  work: () => Promise<{ ok: boolean; lines: string[] }>
): Promise<string[]> {
  const result = await work()
  const expanded = expandSyncLogLines(result.lines, sink.locale)
  return [`> ${commandLine}`, ...expanded]
}

export async function runSyncStatus(locale: UiLocale): Promise<string[]> {
  const status = await getSyncService().status()
  return formatSyncStatusLines(status, locale)
}

export async function runSyncPair(invite: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().pair(invite)
}

export async function runSyncMembers(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().members()
}

export async function runSyncOffer(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().offer()
}

export async function runSyncAnswer(code: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().answer(code)
}

export async function runSyncAccept(code: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().accept(code)
}

export async function runSyncOpen(
  deviceId: string,
  payload: string
): Promise<{ ok: boolean; lines: string[] }> {
  const { urls, groupTitle, closeAfter } = parseOpenPayload(payload)
  const result = await getSyncService().openRemote(deviceId, urls, groupTitle)
  if (!closeAfter || result.openedUrls.length === 0) {
    return { ok: result.ok, lines: result.lines }
  }
  const sources = await resolveLocalTabIdsByUrls(result.openedUrls)
  const toClose = tabIdsForOpenedUrls(sources, result.openedUrls)
  const closed = await closeLocalTabsByIds(toClose)
  return {
    ok: result.ok,
    lines: [...result.lines, `sync.open.closed:${closed}`]
  }
}

export async function runSyncPing(deviceId: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().ping(deviceId)
}

export async function runSyncConnect(
  deviceId: string
): Promise<{ ok: boolean; lines: string[] }> {
  const result = await getSyncService().connect(deviceId)
  return { ok: result.ok, lines: result.lines }
}

export async function applySyncUiLog(
  sink: SyncUiLogSink,
  commandLine: string,
  work: () => Promise<{ ok: boolean; lines: string[] }>
): Promise<void> {
  const lines = await runAndLog(sink, commandLine, work)
  await sink.appendLogLines(lines)
  sink.focusPrompt()
}

export async function syncUiSegmentOutcome(
  locale: UiLocale,
  work: () => Promise<{ ok: boolean; lines: string[] }>
): Promise<SegmentOutcome> {
  const result = await work()
  const lines = expandSyncLogLines(result.lines, locale)
  return result.ok ? segmentSuccess(lines) : segmentFailure("interactive", lines)
}
