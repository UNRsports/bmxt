/**
 * Rust / WASM コア: dispatch・補完候補。Chrome API は `lib/features/dispatch` 側。
 */

import init, {
  completionCandidatesJson,
  dispatchFull,
  tabsPickerReduce,
  tabsPickerResolveEnterIntent,
  tabsPickerResolvePreview,
  tabsPickerValidateExecute,
  tabsPickerResolveTarget,
  tabsPickerResolveGroupTarget,
  tabsPickerResolveNewWindowOrder,
  tabsPickerResolveConfirmPlan,
  tabsPickerResolveMovePlan,
  tabsPickerResolveCreateGroupPlan,
  tabsPickerResolveHeadline
} from "../../../assets/wasm/bmxt-core/bmxt_core.js"
import type { DispatchBundle } from "../dispatch"

export { FALLBACK_COMPLETION_CANDIDATES } from "../builtin-commands"

/** Parcel がハッシュ付き URL に解決する（MV3 の tabs / service worker の両方で同一資産を指す）。 */
const wasmModuleUrl = new URL(
  "../../../assets/wasm/bmxt-core/bmxt_core_bg.wasm",
  import.meta.url
)

let coreReady = false
let ensurePromise: Promise<void> | null = null

export async function ensureBmxtCore(): Promise<void> {
  if (coreReady) {
    return
  }
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await init(wasmModuleUrl)
      coreReady = true
    })()
  }
  try {
    await ensurePromise
  } catch (e) {
    ensurePromise = null
    throw e
  }
}

function assertCoreReady(): void {
  if (!coreReady) {
    throw new Error("BMXt WASM: call ensureBmxtCore() before using core functions")
  }
}

export function parseDispatchJson(raw: string): DispatchBundle {
  assertCoreReady()
  const o = JSON.parse(raw) as DispatchBundle
  if (o.ty === "lines") {
    return { ty: "lines", lines: o.lines ?? [] }
  }
  if (o.ty === "effects") {
    return { ty: "effects", effects: o.effects ?? [] }
  }
  throw new Error(`BMXt: unknown dispatch ty ${(o as { ty?: string }).ty}`)
}

/** 1 行を解決し、Lines または Effects を返す（dispatch の結果パース済み）。 */
export function runDispatch(line: string): DispatchBundle {
  assertCoreReady()
  return parseDispatchJson(dispatchFull(line))
}

let cachedCompletion: string[] | null = null

export function getCompletionCandidates(): string[] {
  assertCoreReady()
  if (!cachedCompletion) {
    const raw = completionCandidatesJson()
    cachedCompletion = JSON.parse(raw) as string[]
  }
  return cachedCompletion
}

/**
 * `rem_euclid` と同じ折り返し（Rust `wrap_index` と一致させる）
 */
function wrapIndexUi(cur: number, delta: number, len: number): number {
  if (len <= 0) {
    return 0
  }
  const l = len
  const x = cur + delta
  return ((x % l) + l) % l
}

type PickerEventLike = {
  kind: string
  delta?: number
  visibleLen?: number
}

type PickerStateLike = {
  hi: number
  moveDestHi: number
}

/**
 * WASM 側でイベント JSON のデシリアライズに失敗すると元の state が返る（`lib.rs` の `Err(_) => return state_json`）。
 * 拡張の再読み込みやビルドの食い違いで起き得るため、移動系だけ JS で再計算する。
 */
export function runTabsPickerReduce<TState, TEvent>(state: TState, event: TEvent): TState {
  assertCoreReady()
  const stateJson = JSON.stringify(state)
  const eventJson = JSON.stringify(event)
  const out = JSON.parse(tabsPickerReduce(stateJson, eventJson)) as TState

  const ev = event as PickerEventLike
  const st = state as PickerStateLike
  if (ev.kind === "moveHi" && typeof ev.delta === "number" && typeof ev.visibleLen === "number") {
    if (typeof st.hi === "number" && ev.visibleLen > 0) {
      const want = wrapIndexUi(st.hi, ev.delta, ev.visibleLen)
      const o = out as PickerStateLike
      if (o.hi === st.hi && want !== st.hi) {
        return { ...out, hi: want } as TState
      }
    }
    return out
  }
  if (ev.kind === "moveDest" && typeof ev.delta === "number" && typeof ev.visibleLen === "number") {
    if (typeof st.moveDestHi === "number" && ev.visibleLen > 0) {
      const want = wrapIndexUi(st.moveDestHi, ev.delta, ev.visibleLen)
      const o = out as PickerStateLike
      if (o.moveDestHi === st.moveDestHi && want !== st.moveDestHi) {
        return { ...out, moveDestHi: want } as TState
      }
    }
  }
  return out
}

export function resolveTabsPickerEnterIntent<TContext, TIntent>(context: TContext): TIntent {
  assertCoreReady()
  const out = tabsPickerResolveEnterIntent(JSON.stringify(context))
  return JSON.parse(out) as TIntent
}

export function resolveTabsPickerPreview<TContext, TDecision>(context: TContext): TDecision {
  assertCoreReady()
  const out = tabsPickerResolvePreview(JSON.stringify(context))
  return JSON.parse(out) as TDecision
}

export function validateTabsPickerExecute<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerValidateExecute(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerTarget<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveTarget(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerGroupTarget<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveGroupTarget(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerNewWindowOrder<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveNewWindowOrder(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerConfirmPlan<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveConfirmPlan(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerMovePlan<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveMovePlan(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

export function resolveTabsPickerCreateGroupPlan<TContext, TResult>(context: TContext): TResult {
  assertCoreReady()
  const out = tabsPickerResolveCreateGroupPlan(JSON.stringify(context))
  return JSON.parse(out) as TResult
}

/** ヘッダー一行（Rust がそのまま文字列を返す）。 */
export function resolveTabsPickerHeadline(context: {
  bulkSubMode: string | null
  groupNewPhase: string
  variant: string
}): string {
  assertCoreReady()
  return tabsPickerResolveHeadline(JSON.stringify(context))
}
