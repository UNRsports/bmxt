/**
 * EN: Defer search-cache warm-up so cold SW + shortcut launch win storage / WASM first.
 * JA: 冷起動ショートカット優先のため search キャッシュウォームを遅延する。
 */

/** EN: Warm eventually if the user never opens BMXt (browser idle). */
export const IDLE_WARM_FALLBACK_MS = 8_000

/** EN: Gap after window launch before warm (page session storage reads first). */
export const POST_LAUNCH_WARM_DELAY_MS = 400

export type WarmSearchStartReason =
  | "idle-timeout"
  | "after-launch"
  | "explicit"
  | "install"
  | "browser-startup"

type WarmSearchState = "idle" | "scheduled" | "running" | "done"

type WarmSearchRun = () => Promise<void>

let warmRunOverride: WarmSearchRun | undefined
let warmState: WarmSearchState = "idle"
let idleTimer: ReturnType<typeof setTimeout> | undefined
let postLaunchTimer: ReturnType<typeof setTimeout> | undefined
let lastStartReason: WarmSearchStartReason | undefined

async function resolveWarmRun(): Promise<WarmSearchRun> {
  if (warmRunOverride) {
    return warmRunOverride
  }
  const { warmSearchCachesOnStartupAsync } = await import(
    "../search/cache/background-listeners.ts"
  )
  return warmSearchCachesOnStartupAsync
}

function clearIdleTimer(): void {
  if (idleTimer !== undefined) {
    clearTimeout(idleTimer)
    idleTimer = undefined
  }
}

function clearPostLaunchTimer(): void {
  if (postLaunchTimer !== undefined) {
    clearTimeout(postLaunchTimer)
    postLaunchTimer = undefined
  }
}

async function startWarmSearchCachesNow(reason: WarmSearchStartReason): Promise<void> {
  if (warmState === "running" || warmState === "done") {
    return
  }
  clearIdleTimer()
  clearPostLaunchTimer()
  warmState = "running"
  lastStartReason = reason
  try {
    const run = await resolveWarmRun()
    await run()
    warmState = "done"
  } catch (err) {
    warmState = "idle"
    throw err
  }
}

/** EN: Schedule warm-up on SW wake; does not run until idle fallback or launch completes. */
export function scheduleDeferredWarmSearchCaches(options?: {
  idleFallbackMs?: number
}): void {
  if (warmState !== "idle") {
    return
  }
  warmState = "scheduled"
  const idleMs = options?.idleFallbackMs ?? IDLE_WARM_FALLBACK_MS
  idleTimer = setTimeout(() => {
    idleTimer = undefined
    void startWarmSearchCachesNow("idle-timeout")
  }, idleMs)
}

/** EN: After install / browser startup — same deferral as SW wake. */
export function scheduleDeferredWarmSearchCachesForLifecycle(
  reason: "install" | "browser-startup"
): void {
  scheduleDeferredWarmSearchCaches()
  void reason
}

/**
 * EN: Call when BMXt window launch chain finishes — warm after a short delay.
 * JA: 窓起動完了後にウォームを開始（プロンプト側 storage と競合しないよう僅かに遅延）。
 */
export function notifyInteractiveLaunchCompleted(options?: {
  postLaunchDelayMs?: number
}): void {
  if (warmState === "done" || warmState === "running") {
    return
  }
  clearIdleTimer()
  clearPostLaunchTimer()
  warmState = "scheduled"
  const delayMs = options?.postLaunchDelayMs ?? POST_LAUNCH_WARM_DELAY_MS
  postLaunchTimer = setTimeout(() => {
    postLaunchTimer = undefined
    void startWarmSearchCachesNow("after-launch")
  }, delayMs)
}

/** EN: Force warm when a background path needs a hot cache (e.g. search command). */
export function ensureWarmSearchCachesStarted(): void {
  if (warmState === "done") {
    return
  }
  if (warmState === "running") {
    return
  }
  void startWarmSearchCachesNow("explicit")
}

export function readWarmSearchSchedulerStateForTests(): {
  warmState: WarmSearchState
  lastStartReason: WarmSearchStartReason | undefined
} {
  return { warmState, lastStartReason }
}

export function resetWarmSearchSchedulerForTests(): void {
  clearIdleTimer()
  clearPostLaunchTimer()
  warmState = "idle"
  lastStartReason = undefined
  warmRunOverride = undefined
}

export function setWarmSearchRunForTests(run: WarmSearchRun): void {
  warmRunOverride = run
}
