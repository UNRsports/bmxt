import { wasmTabsPickerReduce } from "../wasm-host"
import { parseWasmJson } from "./parse-wasm-json"
import type { PickerEvent, PickerState } from "./model"

export function runTabsPickerReduce<TState extends PickerState, TEvent extends PickerEvent>(
  state: TState,
  event: TEvent
): TState {
  const raw = wasmTabsPickerReduce(JSON.stringify(state), JSON.stringify(event))
  return parseWasmJson<TState>(raw)
}

export type { PickerEvent, PickerState } from "./model"
