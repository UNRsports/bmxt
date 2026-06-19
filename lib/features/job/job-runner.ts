import {
  cancelJobHandle,
  createJobHandle,
  isJobHandleActive,
  type BmxtJobHandle
} from "./job-handle.ts"
import {
  JOB_KINDS,
  JOB_SUPERSEDE_POLICY,
  type JobKind,
  type JobMeta,
  type JobStatus,
  type JobSupersedePolicy
} from "./job-types.ts"

export type JobRunOptions = {
  meta?: JobMeta
  /** EN: When false, skip SQLite audit writes (tests / hot paths). Default true. */
  persist?: boolean
}

type ActiveEntry = {
  handle: BmxtJobHandle
  coalesceGeneration: number
}

async function persistJobStartedLazy(
  scopeId: string,
  kind: JobKind,
  meta?: JobMeta
): Promise<number> {
  const { persistJobStarted } = await import("./db/job-db.ts")
  return persistJobStarted(scopeId, kind, meta)
}

async function persistJobFinishedLazy(
  id: number,
  status: Exclude<JobStatus, "running">,
  error: string | null = null
): Promise<void> {
  const { persistJobFinished } = await import("./db/job-db.ts")
  await persistJobFinished(id, status, error)
}

/**
 * EN: Per-scope job runner — cancel/coalesce/parallel policies per kind.
 * JA: スコープ（session / background / terminal）ごとのジョブ実行器。
 */
export class JobRunner {
  readonly scopeId: string
  private seq = 0
  private readonly activeByKind = new Map<JobKind, ActiveEntry>()
  private readonly coalesceGeneration = new Map<JobKind, number>()
  private readonly parallelActive = new Map<JobKind, Set<number>>()

  constructor(scopeId: string) {
    this.scopeId = scopeId
  }

  getActive(kind: JobKind): BmxtJobHandle | null {
    return this.activeByKind.get(kind)?.handle ?? null
  }

  isActive(kind: JobKind): boolean {
    const entry = this.activeByKind.get(kind)
    if (entry) {
      return isJobHandleActive(entry.handle)
    }
    const parallel = this.parallelActive.get(kind)
    return parallel !== undefined && parallel.size > 0
  }

  cancel(kind: JobKind): void {
    const entry = this.activeByKind.get(kind)
    if (entry) {
      this.cancelHandle(entry.handle)
    }
  }

  cancelHandle(job: BmxtJobHandle | null): void {
    if (!job) {
      return
    }
    cancelJobHandle(job)
    this.recordFinished(job, "cancelled")
    const entry = this.activeByKind.get(job.kind)
    if (entry?.handle === job) {
      this.activeByKind.delete(job.kind)
    }
    this.parallelActive.get(job.kind)?.delete(job.id)
  }

  /**
   * EN: Start a job respecting the kind's supersede policy.
   * JA: kind ごとの置換方針に従ってジョブを開始する。
   */
  async start<T>(
    kind: JobKind,
    fn: (job: BmxtJobHandle) => Promise<T>,
    options: JobRunOptions = {}
  ): Promise<T | undefined> {
    const policy = JOB_SUPERSEDE_POLICY[kind]
    if (policy === "coalesce-latest") {
      return this.startCoalesced(kind, fn, options)
    }
    return this.startDirect(kind, fn, policy, options)
  }

  /** EN: Latest generation wins (tab picker refresh and similar). */
  async startCoalesced<T>(
    kind: JobKind,
    fn: (job: BmxtJobHandle, generation: number) => Promise<T>,
    options: JobRunOptions = {}
  ): Promise<T | undefined> {
    const generation = (this.coalesceGeneration.get(kind) ?? 0) + 1
    this.coalesceGeneration.set(kind, generation)
    this.supersedeActive(kind, "superseded")

    const audited = options.persist !== false
    const job = await this.createRunningHandle(kind, options.meta, audited)
    this.activeByKind.set(kind, { handle: job, coalesceGeneration: generation })

    try {
      const result = await fn(job, generation)
      if (job.cancelled || this.coalesceGeneration.get(kind) !== generation) {
        if (!job.cancelled) {
          this.recordFinished(job, "superseded")
        }
        return undefined
      }
      this.recordFinished(job, "completed")
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.recordFinished(job, "failed", message)
      throw e
    } finally {
      const entry = this.activeByKind.get(kind)
      if (entry?.handle === job) {
        this.activeByKind.delete(kind)
      }
    }
  }

  private async startDirect<T>(
    kind: JobKind,
    fn: (job: BmxtJobHandle) => Promise<T>,
    policy: Exclude<JobSupersedePolicy, "coalesce-latest">,
    options: JobRunOptions
  ): Promise<T | undefined> {
    if (policy === "cancel-previous") {
      this.supersedeActive(kind, "cancelled")
    }

    const audited = options.persist !== false
    const job = await this.createRunningHandle(kind, options.meta, audited)
    this.activeByKind.set(kind, { handle: job, coalesceGeneration: 0 })

    if (policy === "parallel") {
      let set = this.parallelActive.get(kind)
      if (!set) {
        set = new Set()
        this.parallelActive.set(kind, set)
      }
      set.add(job.id)
    }

    try {
      const result = await fn(job)
      if (job.cancelled) {
        return undefined
      }
      this.recordFinished(job, "completed")
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.recordFinished(job, "failed", message)
      throw e
    } finally {
      const entry = this.activeByKind.get(kind)
      if (entry?.handle === job) {
        this.activeByKind.delete(kind)
      }
      this.parallelActive.get(kind)?.delete(job.id)
    }
  }

  private async createRunningHandle(
    kind: JobKind,
    meta: JobMeta | undefined,
    audited: boolean
  ): Promise<BmxtJobHandle> {
    const id = audited
      ? await persistJobStartedLazy(this.scopeId, kind, meta)
      : ++this.seq
    const job = createJobHandle(kind, id, this.scopeId, null)
    job.audited = audited
    return job
  }

  private recordFinished(
    job: BmxtJobHandle,
    status: Exclude<JobStatus, "running">,
    error: string | null = null
  ): void {
    if (!job.audited) {
      return
    }
    void persistJobFinishedLazy(job.id, status, error)
  }

  private supersedeActive(kind: JobKind, status: "cancelled" | "superseded"): void {
    const entry = this.activeByKind.get(kind)
    if (!entry) {
      return
    }
    cancelJobHandle(entry.handle)
    this.recordFinished(entry.handle, status)
    this.activeByKind.delete(kind)
  }
}

const runnersByScope = new Map<string, JobRunner>()

export function getJobRunner(scopeId: string): JobRunner {
  let runner = runnersByScope.get(scopeId)
  if (!runner) {
    runner = new JobRunner(scopeId)
    runnersByScope.set(scopeId, runner)
  }
  return runner
}

/** EN: Drop in-memory runner state when a session leaf is removed. */
export function disposeJobRunner(scopeId: string): void {
  const runner = runnersByScope.get(scopeId)
  if (!runner) {
    return
  }
  for (const kind of JOB_KINDS) {
    runner.cancel(kind)
  }
  runnersByScope.delete(scopeId)
}
