/**
 * EN: Backward-compatible shim — prefer `lib/features/job`.
 * JA: 後方互換の薄いラッパ。新規コードは `lib/features/job` を使う。
 */

import type { BmxtJobHandle } from "../job/job-handle"
import {
  cancelJobHandle,
  createJobHandle,
  isJobHandleActive
} from "../job/job-handle"

/** @deprecated Use `BmxtJobHandle` from `lib/features/job`. */
export type SearchListJob = BmxtJobHandle

/** @deprecated Use `JobRunner.start("search-list", ...)`. */
export function createSearchListJob(nextId: number, previous: SearchListJob | null): SearchListJob {
  return createJobHandle("search-list", nextId, "", previous)
}

/** @deprecated Use `JobRunner.cancelHandle` or `cancelJobHandle`. */
export function cancelSearchListJob(job: SearchListJob | null): void {
  cancelJobHandle(job)
}

/** @deprecated Use `isJobHandleActive`. */
export function isSearchListJobActive(job: SearchListJob | null): boolean {
  return isJobHandleActive(job)
}
