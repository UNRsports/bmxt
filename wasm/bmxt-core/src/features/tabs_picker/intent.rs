use serde::{Deserialize, Serialize};

use super::model::{BulkSubMode, PickerState};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PickerVariant {
    Default,
    GroupNew,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupNewPhase {
    Tabs,
    Meta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterContext {
    pub state: PickerState,
    pub variant: PickerVariant,
    pub group_new_phase: GroupNewPhase,
    pub selected_tab_count: usize,
    pub is_shift: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EnterIntent {
    None,
    ConfirmSelection,
    OpenGroupMeta,
    /// ウィンドウ行・newTab モード: URL 入力パネルへ（ターゲットウィンドウは UI 側で解決）
    OpenNewTabUrlMeta,
    ExecuteClose,
    ExecuteMove,
    ExecuteGroup,
    ExecuteNewWindow,
}

pub fn resolve_enter_intent(ctx: EnterContext) -> EnterIntent {
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
    match ctx.state.bulk_sub_mode {
        Some(BulkSubMode::NewTab) => EnterIntent::OpenNewTabUrlMeta,
        Some(BulkSubMode::Close) => EnterIntent::ExecuteClose,
        Some(BulkSubMode::Move) => EnterIntent::ExecuteMove,
        Some(BulkSubMode::Group) => EnterIntent::ExecuteGroup,
        Some(BulkSubMode::NewWindow) => EnterIntent::ExecuteNewWindow,
        None => EnterIntent::ConfirmSelection,
    }
}

#[cfg(test)]
mod enter_intent_serde_tests {
    use super::{EnterContext, EnterIntent};

    #[test]
    fn confirm_selection_serializes_as_string_variant() {
        let s = serde_json::to_string(&EnterIntent::ConfirmSelection).unwrap();
        assert_eq!(s, r#""confirmSelection""#);
    }

    #[test]
    fn no_marks_no_bulk_returns_confirm_selection() {
        let json = r#"{"state":{"hi":0,"moveDestHi":0,"markedKind":null,"markedTabIds":[],"markedWindowIds":[],"markedGroupKeys":[],"bulkSubMode":null},"variant":"default","groupNewPhase":"tabs","selectedTabCount":0,"isShift":false}"#;
        let ctx: EnterContext = serde_json::from_str(json).unwrap();
        assert!(matches!(
            super::resolve_enter_intent(ctx),
            EnterIntent::ConfirmSelection
        ));
    }

    #[test]
    fn bulk_move_with_marks_returns_execute_move() {
        let json = r#"{"state":{"hi":2,"moveDestHi":0,"markedKind":"tab","markedTabIds":[10,11],"markedWindowIds":[],"markedGroupKeys":[],"bulkSubMode":"move"},"variant":"default","groupNewPhase":"tabs","selectedTabCount":2,"isShift":false}"#;
        let ctx: EnterContext = serde_json::from_str(json).unwrap();
        assert!(matches!(
            super::resolve_enter_intent(ctx),
            EnterIntent::ExecuteMove
        ));
    }

    #[test]
    fn bulk_close_returns_execute_close_regardless_of_mark_count() {
        let json = r#"{"state":{"hi":0,"moveDestHi":0,"markedKind":"tab","markedTabIds":[5],"markedWindowIds":[],"markedGroupKeys":[],"bulkSubMode":"close"},"variant":"default","groupNewPhase":"tabs","selectedTabCount":1,"isShift":false}"#;
        let ctx: EnterContext = serde_json::from_str(json).unwrap();
        assert!(matches!(
            super::resolve_enter_intent(ctx),
            EnterIntent::ExecuteClose
        ));
    }

    #[test]
    fn open_new_tab_url_meta_serializes_as_string() {
        let s = serde_json::to_string(&super::EnterIntent::OpenNewTabUrlMeta).unwrap();
        assert_eq!(s, r#""openNewTabUrlMeta""#);
    }

    #[test]
    fn bulk_new_tab_returns_open_new_tab_url_meta() {
        let json = r#"{"state":{"hi":0,"moveDestHi":0,"markedKind":null,"markedTabIds":[],"markedWindowIds":[],"markedGroupKeys":[],"bulkSubMode":"newTab"},"variant":"default","groupNewPhase":"tabs","selectedTabCount":0,"isShift":false}"#;
        let ctx: EnterContext = serde_json::from_str(json).unwrap();
        assert!(matches!(
            super::resolve_enter_intent(ctx),
            EnterIntent::OpenNewTabUrlMeta
        ));
    }
}
