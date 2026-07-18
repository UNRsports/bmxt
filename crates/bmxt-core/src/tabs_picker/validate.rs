use crate::tabs_picker::model::{BulkSubMode, SelectKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidateContext {
    pub marked_kind: Option<SelectKind>,
    pub bulk_sub_mode: Option<BulkSubMode>,
    pub selected_tab_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub implicit_window_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidation {
    pub ok: bool,
    pub reason: Option<String>,
}

fn allowed(kind: &SelectKind, mode: &BulkSubMode) -> bool {
    match kind {
        SelectKind::Window => {
            matches!(
                mode,
                BulkSubMode::Close | BulkSubMode::NewTab | BulkSubMode::Edit | BulkSubMode::Reload
            )
        }
        SelectKind::Group => matches!(
            mode,
            BulkSubMode::Move
                | BulkSubMode::Close
                | BulkSubMode::NewWindow
                | BulkSubMode::Edit
                | BulkSubMode::Reload
        ),
        SelectKind::Tab => !matches!(mode, BulkSubMode::Edit),
    }
}

fn effective_select_kind(ctx: &ExecuteValidateContext) -> Option<SelectKind> {
    if ctx.marked_kind.is_some() {
        return ctx.marked_kind.clone();
    }
    if ctx.implicit_window_id.is_some() {
        return Some(SelectKind::Window);
    }
    None
}

pub fn validate_execute(ctx: &ExecuteValidateContext) -> ExecuteValidation {
    let Some(bulk_sub_mode) = &ctx.bulk_sub_mode else {
        return ExecuteValidation {
            ok: false,
            reason: Some("tabs.picker.error.noBulkMode".to_string()),
        };
    };
    let Some(kind) = effective_select_kind(ctx) else {
        return ExecuteValidation {
            ok: false,
            reason: Some("tabs.picker.error.noSelection".to_string()),
        };
    };
    if !allowed(&kind, bulk_sub_mode) {
        return ExecuteValidation {
            ok: false,
            reason: Some("tabs.picker.error.invalidBulkForKind".to_string()),
        };
    }
    if ctx.selected_tab_count == 0 {
        let allow_without_tabs = matches!(
            (&kind, bulk_sub_mode),
            (SelectKind::Window, BulkSubMode::Close)
                | (SelectKind::Window, BulkSubMode::NewTab)
                | (SelectKind::Window, BulkSubMode::Edit)
                | (SelectKind::Group, BulkSubMode::Edit)
        );
        if !allow_without_tabs {
            return ExecuteValidation {
                ok: false,
                reason: Some("tabs.picker.error.noTabsForAction".to_string()),
            };
        }
    }
    ExecuteValidation {
        ok: true,
        reason: None,
    }
}

pub fn validate_execute_json(context_json: &str) -> String {
    match serde_json::from_str::<ExecuteValidateContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&validate_execute(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}
