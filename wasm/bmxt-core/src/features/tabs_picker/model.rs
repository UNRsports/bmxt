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
    /// ウィンドウ行のみ: 末尾に新規タブ（URL 入力へ）
    NewTab,
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
    /// serde enum-level rename_all はバリアント名のみ改名する。
    /// struct variant のフィールドは各バリアントに個別に指定する。
    #[serde(rename_all = "camelCase")]
    MoveHi { delta: i32, visible_len: usize },
    #[serde(rename_all = "camelCase")]
    MoveDest { delta: i32, visible_len: usize },
    /// `marked_kind` が無いときの ←/→ 用（ハイライト行の種類でサイクル）
    #[serde(rename_all = "camelCase")]
    CycleSubMode {
        direction: i32,
        #[serde(default)]
        implicit_kind: Option<SelectKind>,
    },
    #[serde(rename_all = "camelCase")]
    ToggleCurrent { row: CurrentRow },
    #[serde(rename_all = "camelCase")]
    SelectRange { input: RangeSelectInput },
    ClearMarked,
}
