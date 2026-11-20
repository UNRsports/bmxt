//! EN: Command core. Extension builds with default `wasm`; CLI uses `default-features = false`.
//! JA: 拡張は default `wasm`。CLI は default-features = false（complete はネイティブでも利用可）。
#![cfg_attr(not(feature = "wasm"), allow(dead_code, unused_imports))]

mod cmd;
pub mod command_output;
pub mod complete;
pub mod compound;
pub mod compound_eligibility;
pub mod dispatch;
mod generated;
pub mod ir;
mod line_parse;
pub mod pipe_consumer;
#[cfg(feature = "wasm")]
mod tabs_picker;

pub use command_output::{CommandOutput, LogChannel};
pub use complete::{complete_line, is_pipe_continuation_token, CompleteHit};
pub use dispatch::run_line;
pub use ir::{DispatchBundle, HostEffect, Msg, UiAction};

#[cfg(feature = "wasm")]
mod wasm_api {
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn run(line: &str, _locale: &str) -> String {
        serde_json::to_string(&crate::dispatch::run_line(line)).unwrap_or_else(|e| {
            format!(
                r#"{{"ty":"lines","lines":["error: dispatch failed ({})","Reload the BMXt window / extension if this persists."],"exitStatus":1}}"#,
                e
            )
        })
    }

    #[wasm_bindgen]
    pub fn classify(line: &str, locale: &str) -> String {
        run(line, locale)
    }

    #[wasm_bindgen]
    pub fn parse_pipe(line: &str) -> String {
        crate::compound::parse_pipe_segments_json(line)
    }

    #[wasm_bindgen]
    pub fn parse_compound(line: &str) -> String {
        crate::compound::parse_compound_segments_json(line)
    }

    #[wasm_bindgen]
    pub fn plan_compound(line: &str) -> String {
        crate::compound::plan_compound_line_json(line)
    }

    #[wasm_bindgen]
    pub fn should_run_after_operator(operator: &str, prior_exit_status: i32) -> bool {
        crate::compound::should_run_after_operator(operator, prior_exit_status)
    }

    #[wasm_bindgen]
    pub fn compound_should_stop(exit_status: i32) -> bool {
        crate::compound::compound_should_stop(exit_status)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_reduce(state_json: &str, event_json: &str) -> String {
        crate::tabs_picker::reducer::reduce_json(state_json, event_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_confirm_plan(context_json: &str) -> String {
        crate::tabs_picker::execute_plan::resolve_confirm_plan_json(context_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_move_plan(context_json: &str) -> String {
        crate::tabs_picker::execute_plan::resolve_move_plan_json(context_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_create_group_plan(context_json: &str) -> String {
        crate::tabs_picker::create_group_plan::resolve_create_group_plan_json(context_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_validate_execute(context_json: &str) -> String {
        crate::tabs_picker::validate::validate_execute_json(context_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_enter_intent(context_json: &str) -> String {
        crate::tabs_picker::intent::resolve_enter_intent_json(context_json)
    }

    #[wasm_bindgen]
    pub fn tabs_picker_target(context_json: &str) -> String {
        crate::tabs_picker::target::resolve_target_json(context_json)
    }

    #[wasm_bindgen]
    pub fn completion_tokens() -> String {
        serde_json::to_string(&crate::cmd::all_completion_tokens()).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        })
    }

    /** EN: Fixed-token completion for tiers 1–3; JSON object or `null`. */
    #[wasm_bindgen]
    pub fn complete(line: &str, cursor: usize) -> String {
        crate::complete::complete_json(line, cursor)
    }

    /** EN: Compound/pipe segment eligibility from `run` plan shape. */
    #[wasm_bindgen]
    pub fn compound_segment_eligibility(segment: &str) -> String {
        crate::compound_eligibility::classify_segment_json(segment)
    }

    /** EN: Pipe RHS consumer id (+ flags), or JSON `null`. */
    #[wasm_bindgen]
    pub fn classify_pipe_consumer(segment: &str) -> String {
        crate::pipe_consumer::classify_pipe_consumer_json(segment)
    }
}

#[cfg(feature = "wasm")]
pub use wasm_api::*;

#[cfg(all(test, feature = "wasm"))]
mod wasm_api_tests {
    use super::*;

    #[test]
    fn completion_tokens_json_array() {
        let raw = completion_tokens();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert!(v.is_array());
    }

    #[test]
    fn complete_returns_object_or_null() {
        let raw = complete("tab ", 5);
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert!(v.is_object() || v.is_null());
    }

    #[test]
    fn compound_segment_eligibility_json() {
        let raw = compound_segment_eligibility("tab");
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v["kind"], "continuation");
    }

    #[test]
    fn classify_pipe_consumer_json_export() {
        let raw = classify_pipe_consumer("browse");
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v["id"], "browse");
        assert_eq!(classify_pipe_consumer("not-a-consumer"), "null");
    }
}
