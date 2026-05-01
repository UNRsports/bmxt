use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SelectKind {
    Window,
    Group,
    Tab,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum BulkSubMode {
    Move,
    Close,
    Group,
    NewWindow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickerState {
    pub hi: usize,
    pub move_dest_hi: usize,
    pub marked_kind: Option<SelectKind>,
    pub marked_tab_ids: Vec<i32>,
    pub marked_window_ids: Vec<i32>,
    pub marked_group_keys: Vec<String>,
    pub bulk_sub_mode: Option<BulkSubMode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentRow {
    pub kind: SelectKind,
    pub tab_id: Option<i32>,
    pub window_id: Option<i32>,
    pub group_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RangeSelectInput {
    pub anchor: usize,
    pub target: usize,
    pub rows: Vec<CurrentRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PickerEvent {
    MoveHi { delta: i32, visible_len: usize },
    MoveDest { delta: i32, visible_len: usize },
    CycleSubMode { direction: i32 },
    ToggleCurrent { row: CurrentRow },
    SelectRange { input: RangeSelectInput },
    ClearMarked,
}
