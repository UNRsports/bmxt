/* tslint:disable */
/* eslint-disable */

export function classify(line: string, locale: string): string;

export function completion_tokens(): string;

export function compound_should_stop(exit_status: number): boolean;

export function parse_compound(line: string): string;

export function parse_pipe(line: string): string;

export function plan_compound(line: string): string;

export function run(line: string, _locale: string): string;

export function should_run_after_operator(operator: string, prior_exit_status: number): boolean;

export function tabs_picker_confirm_plan(context_json: string): string;

export function tabs_picker_create_group_plan(context_json: string): string;

export function tabs_picker_enter_intent(context_json: string): string;

export function tabs_picker_move_plan(context_json: string): string;

export function tabs_picker_reduce(state_json: string, event_json: string): string;

export function tabs_picker_target(context_json: string): string;

export function tabs_picker_validate_execute(context_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly classify: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly completion_tokens: (a: number) => void;
    readonly compound_should_stop: (a: number) => number;
    readonly parse_compound: (a: number, b: number, c: number) => void;
    readonly parse_pipe: (a: number, b: number, c: number) => void;
    readonly plan_compound: (a: number, b: number, c: number) => void;
    readonly should_run_after_operator: (a: number, b: number, c: number) => number;
    readonly tabs_picker_confirm_plan: (a: number, b: number, c: number) => void;
    readonly tabs_picker_create_group_plan: (a: number, b: number, c: number) => void;
    readonly tabs_picker_enter_intent: (a: number, b: number, c: number) => void;
    readonly tabs_picker_move_plan: (a: number, b: number, c: number) => void;
    readonly tabs_picker_reduce: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly tabs_picker_target: (a: number, b: number, c: number) => void;
    readonly tabs_picker_validate_execute: (a: number, b: number, c: number) => void;
    readonly run: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
