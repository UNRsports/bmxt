use serde::{Deserialize, Serialize};

use super::model::{BulkSubMode, SelectKind};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidateContext {
    pub marked_kind: Option<SelectKind>,
    pub bulk_sub_mode: Option<BulkSubMode>,
    pub selected_tab_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteValidation {
    pub ok: bool,
    pub reason: Option<String>,
}

fn allowed(kind: SelectKind, mode: BulkSubMode) -> bool {
    match kind {
        SelectKind::Window => matches!(mode, BulkSubMode::Close),
        SelectKind::Group => matches!(mode, BulkSubMode::Move | BulkSubMode::Close | BulkSubMode::NewWindow),
        SelectKind::Tab => true,
    }
}

pub fn validate_execute(ctx: ExecuteValidateContext) -> ExecuteValidation {
    let Some(mode) = ctx.bulk_sub_mode else {
        return ExecuteValidation {
            ok: false,
            reason: Some("モード未選択です。←→で処理を選択してください。".to_string()),
        };
    };
    let Some(kind) = ctx.marked_kind else {
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
        return ExecuteValidation {
            ok: false,
            reason: Some("処理対象のタブがありません。".to_string()),
        };
    }
    ExecuteValidation {
        ok: true,
        reason: None,
    }
}
