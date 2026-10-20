use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmRow {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tab_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConfirmContext {
    pub hi: i32,
    pub rows: Vec<ConfirmRow>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ConfirmPlan {
    // EN: Internally tagged enums do not apply enum-level rename_all to variant fields.
    // JA: タグ付き enum では enum の rename_all がバリアント内フィールドに効かない。
    #[serde(rename_all = "camelCase")]
    ActivateTab { tab_id: i64, window_id: i64 },
    #[serde(rename_all = "camelCase")]
    FocusWindow { window_id: i64 },
    #[serde(rename_all = "camelCase")]
    ActivateFromGroup { window_id: i64, group_id: Option<i64> },
}

pub fn resolve_confirm_plan(ctx: &ResolveConfirmContext) -> Option<ConfirmPlan> {
    let row = ctx.rows.get(ctx.hi as usize)?;
    match row.kind.as_str() {
        "tab" => {
            let tab_id = row.tab_id?;
            let window_id = row.window_id?;
            Some(ConfirmPlan::ActivateTab { tab_id, window_id })
        }
        "window" => {
            let window_id = row.window_id?;
            Some(ConfirmPlan::FocusWindow { window_id })
        }
        "group" => {
            let window_id = row.window_id?;
            Some(ConfirmPlan::ActivateFromGroup {
                window_id,
                group_id: row.group_id,
            })
        }
        _ => None,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveMovePlanContext {
    pub marked_kind: Option<String>,
    pub target_kind: String,
    pub target_tab_id: Option<i64>,
    pub target_window_id: Option<i64>,
    pub target_group_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_tab_group_ids: Vec<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MovePlan {
    pub target_kind: String,
    pub target_tab_id: Option<i64>,
    pub target_window_id: Option<i64>,
    pub target_group_id: Option<i64>,
    pub should_ungroup_after_move: bool,
    pub should_group_to_target_after_move: bool,
    pub tab_group_ids_to_move_as_units: Vec<i64>,
}

pub fn resolve_move_plan(ctx: &ResolveMovePlanContext) -> Option<MovePlan> {
    let is_group_selection = ctx.marked_kind.as_deref() == Some("group");
    let (should_ungroup_after_move, should_group_to_target_after_move) = match ctx.target_kind.as_str()
    {
        "tab" => (
            ctx.target_group_id.is_none(),
            ctx.target_group_id.is_some(),
        ),
        "window" => (false, false),
        "group" => (
            ctx.target_group_id.is_none(),
            ctx.target_group_id.is_some(),
        ),
        _ => return None,
    };
    let tab_group_ids_to_move_as_units = if ctx.target_kind == "window" && is_group_selection {
        ctx.source_tab_group_ids.clone()
    } else {
        Vec::new()
    };
    Some(MovePlan {
        target_kind: ctx.target_kind.clone(),
        target_tab_id: ctx.target_tab_id,
        target_window_id: ctx.target_window_id,
        target_group_id: ctx.target_group_id,
        should_ungroup_after_move,
        should_group_to_target_after_move,
        tab_group_ids_to_move_as_units,
    })
}

pub fn resolve_confirm_plan_json(context_json: &str) -> String {
    match serde_json::from_str::<ResolveConfirmContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&resolve_confirm_plan(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}

pub fn resolve_move_plan_json(context_json: &str) -> String {
    match serde_json::from_str::<ResolveMovePlanContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&resolve_move_plan(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn confirm_plan_serializes_camel_case_fields() {
        let ctx = ResolveConfirmContext {
            hi: 0,
            rows: vec![ConfirmRow {
                kind: "tab".to_string(),
                tab_id: Some(9),
                window_id: Some(2),
                group_id: None,
            }],
        };
        let plan = resolve_confirm_plan(&ctx).expect("plan");
        let json = serde_json::to_string(&plan).unwrap();
        assert!(json.contains(r#""tabId":9"#), "{json}");
        assert!(json.contains(r#""windowId":2"#), "{json}");
        assert!(!json.contains("tab_id"), "{json}");
    }

    #[test]
    fn confirm_plan_json_accepts_camel_case_context() {
        let ctx = r#"{"hi":0,"rows":[{"kind":"window","windowId":5}]}"#;
        let raw = resolve_confirm_plan_json(ctx);
        assert!(raw.contains(r#""kind":"focusWindow""#), "{raw}");
        assert!(raw.contains(r#""windowId":5"#), "{raw}");
    }
}
