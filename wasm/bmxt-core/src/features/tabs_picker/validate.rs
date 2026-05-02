use serde::{Deserialize, Serialize};

use super::model::{BulkSubMode, SelectKind};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidateContext {
    pub marked_kind: Option<SelectKind>,
    pub bulk_sub_mode: Option<BulkSubMode>,
    pub selected_tab_count: usize,
    /// Tab 未選択でウィンドウ行だけハイライトしているときのウィンドウ ID（←→ で close/newTab）
    #[serde(default)]
    pub implicit_window_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidation {
    pub ok: bool,
    pub reason: Option<String>,
}

fn allowed(kind: SelectKind, mode: BulkSubMode) -> bool {
    match kind {
        SelectKind::Window => matches!(mode, BulkSubMode::Close | BulkSubMode::NewTab),
        SelectKind::Group => matches!(mode, BulkSubMode::Move | BulkSubMode::Close | BulkSubMode::NewWindow),
        SelectKind::Tab => true,
    }
}

fn effective_select_kind(ctx: &ExecuteValidateContext) -> Option<SelectKind> {
    if ctx.marked_kind.is_some() {
        return ctx.marked_kind;
    }
    if ctx.implicit_window_id.is_some() {
        return Some(SelectKind::Window);
    }
    None
}

pub fn validate_execute(ctx: ExecuteValidateContext) -> ExecuteValidation {
    let Some(mode) = ctx.bulk_sub_mode else {
        return ExecuteValidation {
            ok: false,
            reason: Some("モード未選択です。←→で処理を選択してください。".to_string()),
        };
    };
    let Some(kind) = effective_select_kind(&ctx) else {
        return ExecuteValidation {
            ok: false,
            reason: Some("選択対象がありません。Tabで選択してください。".to_string()),
        };
    };
    if !allowed(kind, mode) {
        return ExecuteValidation {
            ok: false,
            reason: Some("選択種別ではその処理を実行できません。".to_string()),
        };
    }
    if ctx.selected_tab_count == 0 {
        let allow_without_tabs = matches!(
            (kind, mode),
            (SelectKind::Window, BulkSubMode::Close) | (SelectKind::Window, BulkSubMode::NewTab)
        );
        if !allow_without_tabs {
            return ExecuteValidation {
                ok: false,
                reason: Some("処理対象のタブがありません。".to_string()),
            };
        }
    }
    ExecuteValidation {
        ok: true,
        reason: None,
    }
}

#[cfg(test)]
mod validate_tests {
    use super::{validate_execute, BulkSubMode, ExecuteValidateContext, SelectKind};

    #[test]
    fn implicit_window_close_ok_without_tabs() {
        let v = validate_execute(ExecuteValidateContext {
            marked_kind: None,
            bulk_sub_mode: Some(BulkSubMode::Close),
            selected_tab_count: 0,
            implicit_window_id: Some(42),
        });
        assert!(v.ok);
    }

    #[test]
    fn implicit_window_close_fails_without_window_id() {
        let v = validate_execute(ExecuteValidateContext {
            marked_kind: None,
            bulk_sub_mode: Some(BulkSubMode::Close),
            selected_tab_count: 0,
            implicit_window_id: None,
        });
        assert!(!v.ok);
    }

    #[test]
    fn marked_window_close_ok_with_zero_tabs() {
        let v = validate_execute(ExecuteValidateContext {
            marked_kind: Some(SelectKind::Window),
            bulk_sub_mode: Some(BulkSubMode::Close),
            selected_tab_count: 0,
            implicit_window_id: None,
        });
        assert!(v.ok);
    }

    #[test]
    fn implicit_window_new_tab_ok() {
        let v = validate_execute(ExecuteValidateContext {
            marked_kind: None,
            bulk_sub_mode: Some(BulkSubMode::NewTab),
            selected_tab_count: 0,
            implicit_window_id: Some(7),
        });
        assert!(v.ok);
    }
}
