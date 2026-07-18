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
    MoveHi { delta: i32, visible_len: i32 },
    MoveDest { delta: i32, visible_len: i32 },
    CycleSubMode {
        direction: i32,
        #[serde(skip_serializing_if = "Option::is_none")]
        implicit_kind: Option<SelectKind>,
    },
    ToggleCurrent { row: CurrentRow },
    SelectRange { input: RangeSelectInput },
    ClearMarked,
}
