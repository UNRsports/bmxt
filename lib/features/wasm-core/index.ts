/**
 * Rust / WASM コア: dispatch・補完候補。Chrome API は `lib/features/dispatch` 側。
 */

import init, {
  completionCandidatesJson,
  dispatchFull
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
