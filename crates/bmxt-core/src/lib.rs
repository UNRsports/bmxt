mod cmd;
mod compound;
pub mod dispatch;
mod generated;
pub mod ir;
mod line_parse;
mod tabs_picker;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn run(line: &str, _locale: &str) -> String {
    serde_json::to_string(&dispatch::run_line(line)).unwrap_or_else(|e| {
        format!(
            r#"{{"ty":"lines","lines":["error: dispatch failed ({})","Reload the BMXt window / extension if this persists."]}}"#,
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
    compound::parse_pipe_segments_json(line)
}

#[wasm_bindgen]
pub fn parse_compound(line: &str) -> String {
    compound::parse_compound_segments_json(line)
}

#[wasm_bindgen]
pub fn plan_compound(line: &str) -> String {
    compound::plan_compound_line_json(line)
}

#[wasm_bindgen]
pub fn should_run_after_operator(operator: &str, prior_exit_status: i32) -> bool {
    compound::should_run_after_operator(operator, prior_exit_status)
}

#[wasm_bindgen]
pub fn compound_should_stop(exit_status: i32) -> bool {
    compound::compound_should_stop(exit_status)
}

#[wasm_bindgen]
pub fn tabs_picker_reduce(state_json: &str, event_json: &str) -> String {
    tabs_picker::reduce_json(state_json, event_json)
}

#[wasm_bindgen]
pub fn tabs_picker_confirm_plan(context_json: &str) -> String {
    tabs_picker::execute_plan::resolve_confirm_plan_json(context_json)
}

#[wasm_bindgen]
pub fn tabs_picker_move_plan(context_json: &str) -> String {
    tabs_picker::execute_plan::resolve_move_plan_json(context_json)
}

#[wasm_bindgen]
pub fn tabs_picker_create_group_plan(context_json: &str) -> String {
    tabs_picker::create_group_plan::resolve_create_group_plan_json(context_json)
}

#[wasm_bindgen]
pub fn tabs_picker_validate_execute(context_json: &str) -> String {
    tabs_picker::validate::validate_execute_json(context_json)
}

#[wasm_bindgen]
pub fn tabs_picker_enter_intent(context_json: &str) -> String {
    tabs_picker::intent::resolve_enter_intent_json(context_json)
}

#[wasm_bindgen]
pub fn tabs_picker_target(context_json: &str) -> String {
    tabs_picker::target::resolve_target_json(context_json)
}

#[wasm_bindgen]
pub fn completion_tokens() -> String {
    serde_json::to_string(&cmd::all_completion_tokens()).unwrap_or_else(|e| {
        format!(r#"{{"error":"{}"}}"#, e)
    })
}

#[cfg(test)]
mod wasm_api_tests {
    use super::*;

    #[test]
    fn completion_tokens_json_array() {
        let raw = completion_tokens();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert!(v.is_array());
    }
}
