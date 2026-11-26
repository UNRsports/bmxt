export {
  BACKGROUND_JOB_SCOPE,
  JOB_KINDS,
  JOB_SUPERSEDE_POLICY,
  TERMINAL_JOB_SCOPE
} from "./job-types.ts"

export type { BmxtJobHandle } from "./job-handle.ts"
export {
  cancelJobHandle,
  createJobHandle,
  isJobHandleActive,
  shouldCancelJob
} from "./job-handle.ts"

export type { JobRunOptions } from "./job-runner.ts"
export { JobRunner, disposeJobRunner, getJobRunner } from "./job-runner.ts"

export { mergeJobIntoDispatchContext, type JobProgressHooks } from "./dispatch-context-from-job.ts"

// EN: React hook lives in use-session-job-runner.ts — do not re-export here.
//     Barrel must stay SW-safe (background-services bundles through search-list-command).
// JA: React hook は use-session-job-runner.ts に置く。ここから再 export しない。
//     barrel は SW 安全（background-services が search-list-command 経由で取り込む）。

export { yieldToMain } from "./yield-to-main.ts"

export { isJobSqlitePersistenceAvailable } from "./job-persistence-env.ts"
