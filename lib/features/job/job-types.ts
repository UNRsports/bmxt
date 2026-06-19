/** EN: Canonical job kinds — extend when adding long-running extension work. */
export const JOB_KINDS = [
  "search-list",
  "dom-list",
  "run-cmd",
  "tab-picker-refresh"
] as const

export type JobKind = (typeof JOB_KINDS)[number]

export type JobStatus =
  | "running"
  | "completed"
  | "cancelled"
  | "failed"
  | "superseded"

/** EN: How a new job interacts with an in-flight job of the same kind in one scope. */
export type JobSupersedePolicy = "cancel-previous" | "coalesce-latest" | "parallel"

export type JobMeta = Record<string, string | number | boolean | null | undefined>

export type JobRecord = {
  id: number
  scopeId: string
  kind: JobKind
  status: JobStatus
  createdAt: number
  updatedAt: number
  metaJson: string | null
  error: string | null
}

export const JOB_SUPERSEDE_POLICY: Readonly<Record<JobKind, JobSupersedePolicy>> = {
  "search-list": "cancel-previous",
  "dom-list": "cancel-previous",
  "run-cmd": "parallel",
  "tab-picker-refresh": "coalesce-latest"
}

/** EN: Scope ids reserved by the runtime. */
export const BACKGROUND_JOB_SCOPE = "__background__"
export const TERMINAL_JOB_SCOPE = "__terminal__"
