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

export async function runSyncDir(): Promise<{ ok: boolean; lines: string[] }> {
  const { isFileSystemAccessAvailable } = await import(
    "../../setting/settings-external-storage.ts"
  )
  if (!isFileSystemAccessAvailable()) {
    return { ok: false, lines: ["sync.dir.error:unavailable"] }
  }
  let picked: FileSystemDirectoryHandle
  try {
    picked = await window.showDirectoryPicker({
      id: "bmxt-sync-workdir",
      mode: "readwrite"
    })
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ""
    if (name === "AbortError") {
      return { ok: false, lines: ["sync.dir.cancelled"] }
    }
    if (name === "NotAllowedError" || name === "SecurityError") {
      return { ok: false, lines: ["sync.dir.error:gesture_required"] }
    }
    return { ok: false, lines: ["sync.dir.error:pick_failed"] }
  }
  return getSyncService().bindPickedDir(picked, picked.name)
}

export async function runSyncPair(invite: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().pair(invite)
}

export async function runSyncMembers(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().members()
}

export async function runSyncPull(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().pull()
}

export async function runSyncPush(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().push()
}

export async function runSyncPause(): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().pause()
}

export async function runSyncOpen(
  deviceId: string,
  payload: string
): Promise<{ ok: boolean; lines: string[] }> {
  const { urls, groupTitle } = parseOpenPayload(payload)
  return getSyncService().openRemote(deviceId, urls, groupTitle)
}

export async function runSyncConnect(deviceId: string): Promise<{ ok: boolean; lines: string[] }> {
  return getSyncService().connect(deviceId)
}

export async function applySyncUiLog(
  sink: SyncUiLogSink,
  commandLine: string,
  work: () => Promise<{ ok: boolean; lines: string[] }>
): Promise<void> {
  const lines = await runAndLog(sink, commandLine, work)
  await Promise.resolve(sink.appendLogLines(lines))
  sink.focusPrompt()
}

export async function syncUiSegmentOutcome(
  locale: UiLocale,
  work: () => Promise<{ ok: boolean; lines: string[] }>
): Promise<SegmentOutcome> {
  const result = await work()
  const lines = expandSyncLogLines(result.lines, locale)
  if (result.ok) {
    return segmentSuccess(lines)
  }
  return segmentFailure("runtime", lines, lines[0])
}
