use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupPlanContext {
    pub tab_count: usize,
    pub resolved_tab_count: usize,
    pub same_window: bool,
    pub window_type: Option<String>,
    pub group_tab_count: usize,
    pub moving_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupPlanResult {
    pub ok: bool,
    pub error: Option<String>,
    pub strategy: Option<String>,
}

pub fn resolve_create_group_plan(ctx: CreateGroupPlanContext) -> CreateGroupPlanResult {
    if ctx.tab_count == 0 {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("選択されたタブがありません（一覧に戻り Tab で選び直してください）。".to_string()),
            strategy: None,
        };
    }
    if ctx.resolved_tab_count != ctx.tab_count {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("選択したタブの一部が閉じられています。".to_string()),
            strategy: None,
        };
    }
    if !ctx.same_window {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("選択したタブは同じウィンドウ内である必要があります。".to_string()),
            strategy: None,
        };
    }
    if ctx.window_type.as_deref() != Some("normal") {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("このウィンドウ種別ではタブグループを使えません（Chrome は通常ウィンドウ normal のみ）。popup・app・devtools などではグループ化できません。ウェブページを開いた通常ブラウザウィンドウのタブを選んでください。".to_string()),
            strategy: None,
        };
    }
    if ctx.moving_count == 0 {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("移動するタブ数が不正です".to_string()),
            strategy: None,
        };
    }
    if ctx.moving_count > ctx.group_tab_count {
        return CreateGroupPlanResult {
            ok: false,
            error: Some("移動対象タブがグループに含まれていません".to_string()),
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
