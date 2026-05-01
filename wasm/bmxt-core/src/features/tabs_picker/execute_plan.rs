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
    ActivateTab {
        tab_id: i32,
        window_id: i32,
    },
    FocusWindow {
        window_id: i32,
    },
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
