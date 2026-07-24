use crate::tabs_picker::model::{BulkSubMode, PickerState};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PickerVariant {
    Default,
    GroupNew,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupNewPhase {
    Tabs,
    Meta,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterContext {
    pub state: PickerState,
    pub variant: PickerVariant,
    pub group_new_phase: GroupNewPhase,
    pub selected_tab_count: i32,
    pub is_shift: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EnterIntent {
    None,
    ConfirmSelection,
    OpenGroupMeta,
    OpenNewTabUrlMeta,
    ExecuteClose,
    ExecuteMove,
    ExecuteGroup,
    ExecuteNewWindow,
    ExecuteReload,
}

pub fn resolve_enter_intent(ctx: &EnterContext) -> EnterIntent {
    if ctx.is_shift {
        return EnterIntent::None;
    }
    if matches!(ctx.variant, PickerVariant::GroupNew)
        && matches!(ctx.group_new_phase, GroupNewPhase::Tabs)
    {
        if ctx.selected_tab_count > 0 {
            return EnterIntent::OpenGroupMeta;
        }
        return EnterIntent::ConfirmSelection;
    }
    match &ctx.state.bulk_sub_mode {
        Some(BulkSubMode::NewTab) => EnterIntent::OpenNewTabUrlMeta,
        Some(BulkSubMode::Close) => EnterIntent::ExecuteClose,
        Some(BulkSubMode::Move) => EnterIntent::ExecuteMove,
        Some(BulkSubMode::Group) => EnterIntent::ExecuteGroup,
        Some(BulkSubMode::NewWindow) => EnterIntent::ExecuteNewWindow,
        Some(BulkSubMode::Reload) => EnterIntent::ExecuteReload,
        None => EnterIntent::ConfirmSelection,
        Some(BulkSubMode::Edit) => EnterIntent::ConfirmSelection,
    }
}

pub fn resolve_enter_intent_json(context_json: &str) -> String {
    match serde_json::from_str::<EnterContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&resolve_enter_intent(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}
