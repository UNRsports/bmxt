use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupPlanContext {
    pub tab_count: i32,
    pub resolved_tab_count: i32,
    pub same_window: bool,
    pub window_type: Option<String>,
    pub group_tab_count: i32,
    pub moving_count: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupPlanResult {
    pub ok: bool,
    pub error: Option<String>,
    pub strategy: Option<String>,
}

pub fn resolve_create_group_plan(ctx: &CreateGroupPlanContext) -> CreateGroupPlanResult {
    if ctx.tab_count == 0 {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.noTabs".to_string()),
            strategy: None,
        };
    }
    if ctx.resolved_tab_count != ctx.tab_count {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.partialClosed".to_string()),
            strategy: None,
        };
    }
    if !ctx.same_window {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.sameWindow".to_string()),
            strategy: None,
        };
    }
    if ctx.window_type.as_deref() != Some("normal") {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.windowType".to_string()),
            strategy: None,
        };
    }
    if ctx.moving_count == 0 {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.invalidMoveCount".to_string()),
            strategy: None,
        };
    }
    if ctx.moving_count > ctx.group_tab_count {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("tabs.picker.error.createGroup.notInGroup".to_string()),
            strategy: None,
        };
    }
    if ctx.moving_count == ctx.group_tab_count {
        return CreateGroupPlanResult {
            ok: true,
            error: None,
            strategy: Some("moveWholeGroup".to_string()),
        };
    }
    CreateGroupPlanResult {
        ok: true,
        error: None,
        strategy: Some("ungroupThenMoveTabs".to_string()),
    }
}

pub fn resolve_create_group_plan_json(context_json: &str) -> String {
    match serde_json::from_str::<CreateGroupPlanContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&resolve_create_group_plan(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}
