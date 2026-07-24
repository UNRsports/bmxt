use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SelectKind {
    Window,
    Group,
    Tab,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BulkSubMode {
    Move,
    Close,
    NewTab,
    Group,
    NewWindow,
    Edit,
    Reload,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickerState {
    pub hi: i32,
    pub move_dest_hi: i32,
    pub marked_kind: Option<SelectKind>,
    pub marked_tab_ids: Vec<i64>,
    pub marked_window_ids: Vec<i64>,
    pub marked_group_keys: Vec<String>,
    pub bulk_sub_mode: Option<BulkSubMode>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentRow {
    pub kind: SelectKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tab_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RangeSelectInput {
    pub anchor: i32,
    pub target: i32,
    pub rows: Vec<CurrentRow>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PickerEvent {
    // EN: Internally tagged enums do not apply enum-level rename_all to variant fields.
    // JA: タグ付き enum では enum の rename_all がバリアント内フィールドに効かない。
    #[serde(rename_all = "camelCase")]
    MoveHi { delta: i32, visible_len: i32 },
    #[serde(rename_all = "camelCase")]
    MoveDest { delta: i32, visible_len: i32 },
    #[serde(rename_all = "camelCase")]
    CycleSubMode {
        direction: i32,
        #[serde(skip_serializing_if = "Option::is_none")]
        implicit_kind: Option<SelectKind>,
    },
    #[serde(rename_all = "camelCase")]
    ToggleCurrent { row: CurrentRow },
    #[serde(rename_all = "camelCase")]
    SelectRange { input: RangeSelectInput },
    ClearMarked,
}
