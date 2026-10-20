import { useRef } from "react"

import { getJobRunner, type JobRunner } from "./job-runner.ts"

/** EN: Stable per-session `JobRunner` for one BmxtShell leaf. */
export function useSessionJobRunner(sessionId: string): JobRunner {
  const ref = useRef<JobRunner | null>(null)
  if (ref.current === null) {
    ref.current = getJobRunner(sessionId)
  }
  return ref.current
}
