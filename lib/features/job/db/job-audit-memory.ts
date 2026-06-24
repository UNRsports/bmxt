/**
 * EN: In-memory job audit trail (UI session scope only; no SQLite).
 * JA: ジョブ監査ログのメモリ保持（UI スコープのみ、SQLite なし）。
 */

import type { JobKind, JobMeta, JobRecord, JobStatus } from "../job-types.ts"

let nextJobId = 1
const jobsById = new Map<number, JobRecord>()

function serializeMeta(meta: JobMeta | undefined): string | null {
  if (!meta) {
    return null
  }
  try {
    return JSON.stringify(meta)
  } catch {
    return null
  }
}

export async function persistJobStarted(
  scopeId: string,
  kind: JobKind,
  meta?: JobMeta
): Promise<number> {
  const now = Date.now()
  const id = nextJobId
  nextJobId += 1
  const record: JobRecord = {
    id,
    scopeId,
    kind,
    status: "running",
    createdAt: now,
    updatedAt: now,
    metaJson: serializeMeta(meta),
    error: null
  }
  jobsById.set(id, record)
  return id
}

export async function persistJobFinished(
  id: number,
  status: Exclude<JobStatus, "running">,
  error: string | null = null
): Promise<void> {
  const record = jobsById.get(id)
  if (!record) {
    return
  }
  record.status = status
  record.updatedAt = Date.now()
  record.error = error
}
