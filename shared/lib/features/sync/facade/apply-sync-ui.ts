import { segmentFailure, segmentSuccess } from "../../command-line/compound/classify-outcome"
import type { SegmentOutcome } from "../../command-line/compound/types"
import type { UiLocale } from "../../setting/locale"
import { expandSyncLogLines } from "./expand-sync-log"
import { formatSyncStatusLines } from "./format-status"
import { getSyncService } from "./sync-service"

export type SyncUiLogSink = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}

function parseOpenPayload(payload: string): { urls: string[]; groupTitle: string | null } {
  const parts = payload.trim().split(/\s+/).filter((p) => p.length > 0)
  let groupTitle: string | null = null
  const urls: string[] = []
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!
    if (part === "--group" && i + 1 < parts.length) {
      groupTitle = parts[i + 1]!
      i += 1
      continue
    }
    urls.push(part)
  }
  return { urls, groupTitle }
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
  const { urls, groupTitle } = parseOpenPayload(payload)
  return getSyncService().openRemote(deviceId, urls, groupTitle)
}

export async function runSyncPing(deviceId: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().ping(deviceId)
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
