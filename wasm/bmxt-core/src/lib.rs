//! BMXt コマンドコア（Rust / WASM）。Chrome API は持たず、dispatch 結果は Lines か Effects の JSON。

mod cmd;
mod dispatch;
mod features;
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

#[wasm_bindgen(js_name = tabsPickerReduce)]
pub fn tabs_picker_reduce_js(state_json: &str, event_json: &str) -> String {
    use crate::features::tabs_picker::model::{PickerEvent, PickerState};
    use crate::features::tabs_picker::reducer::reduce;

    let state: PickerState = match serde_json::from_str(state_json) {
        Ok(s) => s,
        Err(_) => return state_json.to_string(),
    };
    let ev: PickerEvent = match serde_json::from_str(event_json) {
        Ok(e) => e,
        Err(_) => return state_json.to_string(),
    };
    serde_json::to_string(&reduce(state, ev)).unwrap_or_else(|_| state_json.to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveEnterIntent)]
pub fn tabs_picker_resolve_enter_intent_js(context_json: &str) -> String {
    use crate::features::tabs_picker::intent::{resolve_enter_intent, EnterContext};
    let ctx: EnterContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => return "\"none\"".to_string(),
    };
    serde_json::to_string(&resolve_enter_intent(ctx)).unwrap_or_else(|_| "\"none\"".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolvePreview)]
pub fn tabs_picker_resolve_preview_js(context_json: &str) -> String {
    use crate::features::tabs_picker::preview::{resolve_preview, PreviewContext, PreviewDecision};
    let ctx: PreviewContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => {
            return serde_json::to_string(&PreviewDecision {
                next_hi: 0,
                activate_tab_id: None,
            })
            .unwrap_or_else(|_| "{\"nextHi\":0,\"activateTabId\":null}".to_string())
        }
    };
    serde_json::to_string(&resolve_preview(ctx))
        .unwrap_or_else(|_| "{\"nextHi\":0,\"activateTabId\":null}".to_string())
}

#[wasm_bindgen(js_name = tabsPickerValidateExecute)]
pub fn tabs_picker_validate_execute_js(context_json: &str) -> String {
    use crate::features::tabs_picker::validate::{validate_execute, ExecuteValidateContext, ExecuteValidation};
    let ctx: ExecuteValidateContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => {
            return serde_json::to_string(&ExecuteValidation {
                ok: false,
                reason: Some("実行判定の入力が不正です。".to_string()),
            })
            .unwrap_or_else(|_| "{\"ok\":false,\"reason\":\"invalid input\"}".to_string())
        }
    };
    serde_json::to_string(&validate_execute(ctx))
        .unwrap_or_else(|_| "{\"ok\":false,\"reason\":\"validation failed\"}".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveTarget)]
pub fn tabs_picker_resolve_target_js(context_json: &str) -> String {
    use crate::features::tabs_picker::target::{resolve_target, ResolveTargetContext};
    let ctx: ResolveTargetContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => return "null".to_string(),
    };
    serde_json::to_string(&resolve_target(ctx)).unwrap_or_else(|_| "null".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveGroupTarget)]
pub fn tabs_picker_resolve_group_target_js(context_json: &str) -> String {
    use crate::features::tabs_picker::group_target::{resolve_group_target, ResolveGroupTargetContext};
    let ctx: ResolveGroupTargetContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => return "null".to_string(),
    };
    serde_json::to_string(&resolve_group_target(ctx)).unwrap_or_else(|_| "null".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveNewWindowOrder)]
pub fn tabs_picker_resolve_new_window_order_js(context_json: &str) -> String {
    use crate::features::tabs_picker::new_window::{
        resolve_new_window_order, ResolveNewWindowOrderContext, ResolvedNewWindowOrder,
    };
    let ctx: ResolveNewWindowOrderContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => {
            return serde_json::to_string(&ResolvedNewWindowOrder {
                ordered_ids: vec![],
            })
            .unwrap_or_else(|_| "{\"orderedIds\":[]}".to_string())
        }
    };
    serde_json::to_string(&resolve_new_window_order(ctx))
        .unwrap_or_else(|_| "{\"orderedIds\":[]}".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveConfirmPlan)]
pub fn tabs_picker_resolve_confirm_plan_js(context_json: &str) -> String {
    use crate::features::tabs_picker::execute_plan::{resolve_confirm_plan, ResolveConfirmContext};
    let ctx: ResolveConfirmContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => return "null".to_string(),
    };
    serde_json::to_string(&resolve_confirm_plan(ctx)).unwrap_or_else(|_| "null".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveMovePlan)]
pub fn tabs_picker_resolve_move_plan_js(context_json: &str) -> String {
    use crate::features::tabs_picker::execute_plan::{resolve_move_plan, ResolveMovePlanContext};
    let ctx: ResolveMovePlanContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => return "null".to_string(),
    };
    serde_json::to_string(&resolve_move_plan(ctx)).unwrap_or_else(|_| "null".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveCreateGroupPlan)]
pub fn tabs_picker_resolve_create_group_plan_js(context_json: &str) -> String {
    use crate::features::tabs_picker::create_group_plan::{
        resolve_create_group_plan, CreateGroupPlanContext, CreateGroupPlanResult,
    };
    let ctx: CreateGroupPlanContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => {
            return serde_json::to_string(&CreateGroupPlanResult {
                ok: false,
                error: Some("グループ作成計画の入力が不正です。".to_string()),
                strategy: None,
            })
            .unwrap_or_else(|_| "{\"ok\":false,\"error\":\"invalid input\",\"strategy\":null}".to_string())
        }
    };
    serde_json::to_string(&resolve_create_group_plan(ctx))
        .unwrap_or_else(|_| "{\"ok\":false,\"error\":\"plan failed\",\"strategy\":null}".to_string())
}

#[wasm_bindgen(js_name = tabsPickerResolveHeadline)]
pub fn tabs_picker_resolve_headline_js(context_json: &str) -> String {
    use crate::features::tabs_picker::headline::{resolve_headline, HeadlineContext};
    let ctx: HeadlineContext = match serde_json::from_str(context_json) {
        Ok(v) => v,
        Err(_) => {
            return "Tab picker".to_string();
        }
    };
    resolve_headline(ctx)
}
