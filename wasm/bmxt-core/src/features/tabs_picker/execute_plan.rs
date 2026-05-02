use serde::{Deserialize, Serialize};

use super::model::SelectKind;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmRow {
    pub kind: String,
    pub tab_id: Option<i32>,
    pub window_id: Option<i32>,
    pub group_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConfirmContext {
    pub hi: usize,
    pub rows: Vec<ConfirmRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ConfirmPlan {
    /// serde の `rename_all` は enum レベルではバリアント名だけ改名する。
    /// struct variant のフィールドは各バリアントに個別に指定が必要。
    #[serde(rename_all = "camelCase")]
    ActivateTab {
        tab_id: i32,
        window_id: i32,
    },
    #[serde(rename_all = "camelCase")]
    FocusWindow {
        window_id: i32,
    },
    #[serde(rename_all = "camelCase")]
    ActivateFromGroup {
        window_id: i32,
        group_id: Option<i32>,
    },
}

pub fn resolve_confirm_plan(ctx: ResolveConfirmContext) -> Option<ConfirmPlan> {
    let row = ctx.rows.get(ctx.hi)?;
    match row.kind.as_str() {
        "tab" => Some(ConfirmPlan::ActivateTab {
            tab_id: row.tab_id?,
            window_id: row.window_id?,
        }),
        "window" => Some(ConfirmPlan::FocusWindow {
            window_id: row.window_id?,
        }),
        "group" => Some(ConfirmPlan::ActivateFromGroup {
            window_id: row.window_id?,
            group_id: row.group_id,
        }),
        _ => None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveMovePlanContext {
    pub marked_kind: Option<SelectKind>,
    pub target_kind: String,
    pub target_tab_id: Option<i32>,
    pub target_window_id: Option<i32>,
    pub target_group_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MovePlan {
    pub target_kind: String,
    pub target_tab_id: Option<i32>,
    pub target_window_id: Option<i32>,
    pub target_group_id: Option<i32>,
    pub should_ungroup_after_move: bool,
    pub should_group_to_target_after_move: bool,
}

pub fn resolve_move_plan(ctx: ResolveMovePlanContext) -> Option<MovePlan> {
    let is_group_selection = matches!(ctx.marked_kind, Some(SelectKind::Group));
    let (should_ungroup_after_move, should_group_to_target_after_move) = match ctx.target_kind.as_str() {
        "tab" => {
            if is_group_selection {
                (ctx.target_group_id.is_none(), ctx.target_group_id.is_some())
            } else {
                (false, false)
            }
        }
        "window" => (is_group_selection, false),
        "group" => (ctx.target_group_id.is_none(), ctx.target_group_id.is_some()),
        _ => return None,
    };
    Some(MovePlan {
        target_kind: ctx.target_kind,
        target_tab_id: ctx.target_tab_id,
        target_window_id: ctx.target_window_id,
        target_group_id: ctx.target_group_id,
        should_ungroup_after_move,
        should_group_to_target_after_move,
    })
}

#[cfg(test)]
mod tests {
    use super::{resolve_confirm_plan, ConfirmPlan, ResolveConfirmContext};

    #[test]
    fn activate_tab_json_fields_are_camel_case() {
        let s = serde_json::to_string(&ConfirmPlan::ActivateTab { tab_id: 42, window_id: 10 }).unwrap();
        assert!(s.contains("\"tabId\""), "tabId missing, got: {s}");
        assert!(s.contains("\"windowId\""), "windowId missing, got: {s}");
    }

    #[test]
    fn confirm_plan_roundtrip_from_ts_json() {
        // TS sends camelCase keys; Rust must deserialize and re-serialize them correctly
        let ctx_json = r#"{"hi":1,"rows":[{"kind":"window","windowId":100},{"kind":"tab","tabId":55,"windowId":200,"groupId":null}]}"#;
        let ctx: ResolveConfirmContext = serde_json::from_str(ctx_json).unwrap();
        let plan = resolve_confirm_plan(ctx).unwrap();
        let s = serde_json::to_string(&plan).unwrap();
        assert!(s.contains("\"tabId\":55"), "tabId absent, got: {s}");
        assert!(s.contains("\"windowId\":200"), "windowId absent, got: {s}");
        assert!(s.contains("\"activateTab\""), "kind absent, got: {s}");
    }
}
