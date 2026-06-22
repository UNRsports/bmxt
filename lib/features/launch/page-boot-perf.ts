/** EN: Page boot timing (bmxt.html → prompt interactive). */
/** JA: ページ起動計測（bmxt.html → プロンプト操作可能）。 */

import { LAUNCH_PERF_SESSION_KEY } from "./launch-perf.ts"
import { logPerfSnapshot, PERF_LOG_COPY_PREFIX } from "./perf-log.ts"

export const PAGE_BOOT_PERF_SESSION_KEY = "bmxt_page_boot_perf"

export type PageBootPerfPhase =
  | "page-script-start"
  | "warm-background-start"
  | "warm-background-done"
  | "react-chunks-loaded"
  | "bmxt-core-ready"
  | "react-render-start"
  | "terminal-mounted"
  | "session-init-start"
  | "session-init-done"
  | "gate-background-ready"
  | "gate-upgrade-banner-ready"
  | "gate-process-ui-ready"
  | "gate-session-state-ready"
  | "prompt-interactive"

export type PageBootPerfSnapshot = {
  ts: number
  phases: Record<string, number>
  promptInteractiveMs?: number
}

export type BootPerfReport = {
  sw: unknown
  page: PageBootPerfSnapshot
}

let originMs = 0
const marks = new Map<PageBootPerfPhase, number>()
let flushed = false

export function resetPageBootPerf(origin: number = performance.now()): void {
  originMs = origin
  marks.clear()
  flushed = false
}

export function markPageBootPhase(phase: PageBootPerfPhase): void {
  if (marks.has(phase)) {
    return
  }
  marks.set(phase, Math.round(performance.now() - originMs))
}

export function readPageBootPerfMarks(): ReadonlyMap<PageBootPerfPhase, number> {
  return marks
}

export async function readBootPerfReportFromStorageAsync(): Promise<BootPerfReport | null> {
  try {
    if (typeof chrome === "undefined" || !chrome.storage?.session) {
      return null
    }
    const stored = await chrome.storage.session.get([
      LAUNCH_PERF_SESSION_KEY,
      PAGE_BOOT_PERF_SESSION_KEY
    ])
    const page = stored[PAGE_BOOT_PERF_SESSION_KEY]
    if (!page || typeof page !== "object") {
      return null
    }
    return {
      sw: stored[LAUNCH_PERF_SESSION_KEY] ?? null,
      page: page as PageBootPerfSnapshot
    }
  } catch {
    return null
  }
}

export async function logBootPerfReportToConsoleAsync(): Promise<BootPerfReport | null> {
  const report = await readBootPerfReportFromStorageAsync()
  if (!report) {
    console.info(`${PERF_LOG_COPY_PREFIX} boot-perf-report: null`)
    return null
  }
  logPerfSnapshot("boot-perf-report", report)
  return report
}

/** EN: `bmxtPerfReport()` in page DevTools — re-print last SW + page snapshot. */
export function installPageBootPerfConsoleHelpers(): void {
  const g = globalThis as Record<string, unknown>
  g.bmxtPerfReport = () => void logBootPerfReportToConsoleAsync()
}

export async function flushPageBootPerf(): Promise<PageBootPerfSnapshot> {
  if (flushed) {
    const existing = await readBootPerfReportFromStorageAsync()
    if (existing) {
      return existing.page
    }
  }
  flushed = true

  const promptInteractiveMs = marks.get("prompt-interactive")
  const payload: PageBootPerfSnapshot = {
    ts: Date.now(),
    phases: Object.fromEntries(marks),
    ...(promptInteractiveMs !== undefined ? { promptInteractiveMs } : {})
  }

  try {
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      await chrome.storage.session.set({ [PAGE_BOOT_PERF_SESSION_KEY]: payload })
    }
  } catch {
    /* session storage may be unavailable during tests */
  }

  let swLaunch: unknown = null
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      const swStored = await chrome.storage.session.get(LAUNCH_PERF_SESSION_KEY)
      swLaunch = swStored[LAUNCH_PERF_SESSION_KEY] ?? null
    }
  } catch {
    /* session storage may be unavailable during tests */
  }

  logPerfSnapshot("page-boot", {
    page: payload,
    sw: swLaunch
  })

  return payload
}
