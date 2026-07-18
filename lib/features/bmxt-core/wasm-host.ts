/**
 * EN: Lazy singleton loader for bmxt-core WASM (wasm-pack web target).
 * JA: bmxt-core WASM（wasm-pack web）の遅延シングルトンローダー。
 */

import init, {
  classify,
  completion_tokens,
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
