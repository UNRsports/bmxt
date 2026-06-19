import type { JobKind } from "./job-types.ts"

/** EN: In-memory cancellation handle for one job invocation. */
export type BmxtJobHandle = {
  id: number
  kind: JobKind
  scopeId: string
  cancelled: boolean
  /** EN: When true, lifecycle is mirrored to the SQLite job DB. */
  audited?: boolean
}

export function createJobHandle(
  kind: JobKind,
  id: number,
  scopeId: string,
  previous: BmxtJobHandle | null
): BmxtJobHandle {
  if (previous) {
    previous.cancelled = true
  }
  return { id, kind, scopeId, cancelled: false }
}

export function cancelJobHandle(job: BmxtJobHandle | null): void {
  if (job) {
    job.cancelled = true
  }
}

export function isJobHandleActive(job: BmxtJobHandle | null): boolean {
  return job !== null && !job.cancelled
}

export function shouldCancelJob(job: BmxtJobHandle | null): boolean {
  return job?.cancelled ?? false
}
