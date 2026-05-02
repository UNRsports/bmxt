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
    /// グループ行マーク時の Chrome `tabGroups` ID（TS が `markedGroupKeys` から抽出）。未指定は空。
    #[serde(default)]
    pub source_tab_group_ids: Vec<i32>,
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
    /// 別ウィンドウへ移すとき `chrome.tabGroups.move` でグループ単位を保つ対象 ID。
    #[serde(default)]
    pub tab_group_ids_to_move_as_units: Vec<i32>,
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
        // ウィンドウ行へはタブをばらさず移動する（グループ選択時も `ungroup` しない）。
        "window" => (false, false),
        "group" => (ctx.target_group_id.is_none(), ctx.target_group_id.is_some()),
        _ => return None,
    };
    let tab_group_ids_to_move_as_units =
        if ctx.target_kind.as_str() == "window" && is_group_selection {
            ctx.source_tab_group_ids.clone()
        } else {
            vec![]
        };
    Some(MovePlan {
        target_kind: ctx.target_kind,
        target_tab_id: ctx.target_tab_id,
        target_window_id: ctx.target_window_id,
        target_group_id: ctx.target_group_id,
        should_ungroup_after_move,
        should_group_to_target_after_move,
        tab_group_ids_to_move_as_units,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_confirm_plan, resolve_move_plan, ConfirmPlan, ResolveConfirmContext,
        ResolveMovePlanContext,
    };
    use crate::features::tabs_picker::model::SelectKind;

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

    #[test]
    fn move_plan_window_target_never_ungroups_even_for_group_selection() {
        let p = resolve_move_plan(ResolveMovePlanContext {
            marked_kind: Some(SelectKind::Group),
            target_kind: "window".to_string(),
            target_tab_id: None,
            target_window_id: Some(9),
            target_group_id: None,
            source_tab_group_ids: vec![42],
        })
        .unwrap();
        assert!(!p.should_ungroup_after_move);
        assert_eq!(p.tab_group_ids_to_move_as_units, vec![42]);
    }

    #[test]
    fn move_plan_window_as_units_only_when_group_selection() {
        let p = resolve_move_plan(ResolveMovePlanContext {
            marked_kind: Some(SelectKind::Tab),
            target_kind: "window".to_string(),
            target_tab_id: None,
            target_window_id: Some(9),
            target_group_id: None,
            source_tab_group_ids: vec![42],
        })
        .unwrap();
        assert!(p.tab_group_ids_to_move_as_units.is_empty());
    }
}
