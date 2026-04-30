//! BMXt コマンドコア（Rust / WASM）。Chrome API は持たず、dispatch 結果は Lines か Effects の JSON。

mod cmd;
mod dispatch;
mod line_parse;
mod meta;
mod model;
mod registry;
mod tabs_man;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = dispatchFull)]
pub fn dispatch_full_js(line: &str) -> String {
    dispatch::dispatch_full(line)
}

#[wasm_bindgen(js_name = completionCandidatesJson)]
pub fn completion_candidates_json() -> String {
    serde_json::to_string(&registry::all_completion_tokens()).unwrap()
}
