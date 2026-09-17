/**
 * EN: Lazy singleton loader for bmxt-core WASM (wasm-pack web target).
 * JA: bmxt-core WASM（wasm-pack web）の遅延シングルトンローダー。
 */

import init, {
  classify,
  complete,
  completion_tokens,
  compound_segment_eligibility,
  initSync,
  parse_compound,
  parse_pipe,
  plan_compound,
  run,
  tabs_picker_confirm_plan,
  tabs_picker_create_group_plan,
  tabs_picker_enter_intent,
  tabs_picker_move_plan,
  tabs_picker_reduce,
  tabs_picker_target,
  tabs_picker_validate_execute
} from "../../wasm/bmxt-core/bmxt_core.js"
import {
  utf16OffsetToUtf8ByteOffset,
  utf8ByteOffsetToUtf16Offset
} from "./utf16-utf8-offset.ts"

let initialized = false
let initPromise: Promise<void> | null = null

function chromeWasmUrl(): string | undefined {
  if (typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function") {
    return chrome.runtime.getURL("bmxt_core_bg.wasm")
  }
  return undefined
}

function assertReady(): void {
  if (!initialized) {
    throw new Error("BMXt core WASM not initialized; call ensureBmxtCore() first")
  }
}

/**
 * EN: Sync init from raw `.wasm` bytes (Node tests). Not used in extension bundles.
 * JA: 生 `.wasm` バイトからの同期初期化（Node テスト用。拡張バンドルでは使わない）。
 */
export function ensureBmxtCoreFromBytes(bytes: Uint8Array): void {
  if (initialized) {
    return
  }
  initSync({ module: bytes })
  initialized = true
}

/** Load and instantiate bmxt-core WASM once per JS realm (extension UI / SW). */
export async function ensureBmxtCore(): Promise<void> {
  if (initialized) {
    return
  }
  if (!initPromise) {
    initPromise = (async () => {
      const chromeUrl = chromeWasmUrl()
      if (!chromeUrl) {
        throw new Error(
          "BMXt core WASM: chrome.runtime.getURL unavailable (use ensureBmxtCoreFromBytes in Node tests)"
        )
      }
      await init({ module_or_path: chromeUrl })
      initialized = true
    })()
  }
  await initPromise
}

export function isBmxtCoreReady(): boolean {
  return initialized
}

export function wasmRun(line: string, locale: string): string {
  assertReady()
  return run(line, locale)
}

export function wasmClassify(line: string, locale: string): string {
  assertReady()
  return classify(line, locale)
}

export function wasmParsePipe(line: string): string {
  assertReady()
  return parse_pipe(line)
}

export function wasmParseCompound(line: string): string {
  assertReady()
  return parse_compound(line)
}

export function wasmPlanCompound(line: string): string {
  assertReady()
  return plan_compound(line)
}

export function wasmCompletionTokens(): string {
  assertReady()
  return completion_tokens()
}

/**
 * EN: Remap WASM `complete` hit offsets from UTF-8 bytes back to JS UTF-16 indices.
 * JA: WASM `complete` のヒットオフセットを UTF-8 バイトから JS の UTF-16 指数へ戻す。
 */
function remapCompleteHitJsonToUtf16(line: string, raw: string): string {
  if (raw === "null" || raw.length === 0) {
    return raw
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") {
      return raw
    }
    const o = parsed as Record<string, unknown>
    if (typeof o.tokenStart !== "number" || typeof o.tokenEnd !== "number") {
      return raw
    }
    o.tokenStart = utf8ByteOffsetToUtf16Offset(line, o.tokenStart)
    o.tokenEnd = utf8ByteOffsetToUtf16Offset(line, o.tokenEnd)
    return JSON.stringify(o)
  } catch {
    return "null"
  }
}

/**
 * EN: Fixed-token complete — `cursor` is a JS UTF-16 offset (converted to UTF-8 for Rust).
 * JA: 固定トークン補完 — `cursor` は JS の UTF-16 オフセット（Rust 向けに UTF-8 へ変換）。
 */
export function wasmComplete(line: string, cursor: number): string {
  assertReady()
  try {
    const byteCursor = utf16OffsetToUtf8ByteOffset(line, cursor)
    const raw = complete(line, byteCursor)
    return remapCompleteHitJsonToUtf16(line, raw)
  } catch {
    // EN: Never let a WASM panic tear down prompt editing (e.g. mid-CJK caret).
    return "null"
  }
}

export function wasmCompoundSegmentEligibility(segment: string): string {
  assertReady()
  return compound_segment_eligibility(segment)
}

export function wasmTabsPickerReduce(stateJson: string, eventJson: string): string {
  assertReady()
  return tabs_picker_reduce(stateJson, eventJson)
}

export function wasmTabsPickerConfirmPlan(contextJson: string): string {
  assertReady()
  return tabs_picker_confirm_plan(contextJson)
}

export function wasmTabsPickerMovePlan(contextJson: string): string {
  assertReady()
  return tabs_picker_move_plan(contextJson)
}

export function wasmTabsPickerCreateGroupPlan(contextJson: string): string {
  assertReady()
  return tabs_picker_create_group_plan(contextJson)
}

export function wasmTabsPickerValidateExecute(contextJson: string): string {
  assertReady()
  return tabs_picker_validate_execute(contextJson)
}

export function wasmTabsPickerEnterIntent(contextJson: string): string {
  assertReady()
  return tabs_picker_enter_intent(contextJson)
}

export function wasmTabsPickerTarget(contextJson: string): string {
  assertReady()
  return tabs_picker_target(contextJson)
}
