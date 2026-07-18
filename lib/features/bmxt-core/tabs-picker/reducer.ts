import { wasmTabsPickerReduce } from "../wasm-host"
import type { PickerEvent, PickerState } from "./model"

function parseWasmJson<T>(raw: string): T {
  const parsed = JSON.parse(raw) as T | { error?: string }
  if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
    throw new Error(String(parsed.error))
  }
  return parsed as T
}

export function runTabsPickerReduce<TState extends PickerState, TEvent extends PickerEvent>(
  state: TState,
  event: TEvent
): TState {
  const raw = wasmTabsPickerReduce(JSON.stringify(state), JSON.stringify(event))
  return parseWasmJson<TState>(raw)
}

export type { PickerEvent, PickerState } from "./model"
