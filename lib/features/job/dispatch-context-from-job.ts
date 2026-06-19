import type { DispatchChromeContext } from "../dispatch/dispatch-context.ts"
import type { BmxtJobHandle } from "./job-handle.ts"
import { shouldCancelJob } from "./job-handle.ts"

export type JobProgressHooks = {
  onSearchPageProgress?: (message: string) => Promise<void>
  searchPageProgressLabel?: string
}

/** EN: Attach cooperative cancel (+ optional progress) from a job handle onto dispatch context. */
export function mergeJobIntoDispatchContext(
  ctx: DispatchChromeContext,
  job: BmxtJobHandle,
  progress?: JobProgressHooks
): DispatchChromeContext {
  const shouldCancel = () => shouldCancelJob(job)
  return {
    ...ctx,
    shouldCancel,
    shouldCancelSearchPage: shouldCancel,
    onSearchPageProgress: progress?.onSearchPageProgress ?? ctx.onSearchPageProgress,
    searchPageProgressLabel: progress?.searchPageProgressLabel ?? ctx.searchPageProgressLabel
  }
}
