/** EN: Cancellation handle for one in-flight `search -list` run (per BmxtShell / session). */
export type SearchListJob = {
  id: number
  cancelled: boolean
}

export function createSearchListJob(nextId: number, previous: SearchListJob | null): SearchListJob {
  if (previous) {
    previous.cancelled = true
  }
  return { id: nextId, cancelled: false }
}

export function cancelSearchListJob(job: SearchListJob | null): void {
  if (job) {
    job.cancelled = true
  }
}

export function isSearchListJobActive(job: SearchListJob | null): boolean {
  return job !== null && !job.cancelled
}
