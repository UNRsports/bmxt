/** EN: Service-worker launch timing (Shift+Alt+C / window open). */
/** JA: ショートカット起動の計測（chrome.storage.session に直近 1 回分を保存）。 */

export const LAUNCH_PERF_SESSION_KEY = "bmxt_launch_perf"

export type LaunchPerfPhase =
  | "sw-listeners-ready"
  | "shortcut-received"
  | "resolve-window-start"
  | "resolve-window-done"
  | "focus-window-done"
  | "create-window-done"
  | "launch-chain-done"

export type LaunchPerfSnapshot = {
  ts: number
  phases: Record<string, number>
  launchChainMs?: number
  warmSearchReason?: string
}

let originMs = 0
const marks = new Map<LaunchPerfPhase, number>()

export function resetLaunchPerf(origin: number = performance.now()): void {
  originMs = origin
  marks.clear()
}

export function markLaunchPhase(phase: LaunchPerfPhase): void {
  marks.set(phase, Math.round(performance.now() - originMs))
}

export function readLaunchPerfMarks(): ReadonlyMap<LaunchPerfPhase, number> {
  return marks
}

export async function flushLaunchPerf(extra?: {
  launchChainMs?: number
  warmSearchReason?: string
}): Promise<LaunchPerfSnapshot> {
  const payload: LaunchPerfSnapshot = {
    ts: Date.now(),
    phases: Object.fromEntries(marks),
    ...extra
  }
  try {
    await chrome.storage.session.set({ [LAUNCH_PERF_SESSION_KEY]: payload })
  } catch {
    /* session storage may be unavailable during tests */
  }
  console.info("[bmxt launch perf]", payload)
  return payload
}
