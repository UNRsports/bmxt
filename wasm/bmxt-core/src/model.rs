//! dispatch の JSON 形と Effect（serde で TS と共有）。

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DispatchJson {
    pub ty: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lines: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effects: Option<Vec<Effect>>,
}

impl DispatchJson {
    pub fn lines(lines: Vec<String>) -> Self {
        Self {
            ty: "lines",
            lines: Some(lines),
            effects: None,
        }
    }
    pub fn effects(effects: Vec<Effect>) -> Self {
        Self {
            ty: "effects",
            lines: None,
            effects: Some(effects),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Effect {
    ClearLog,
    ListWindows,
    FocusInfo,
    Activate { tab_id: i32 },
    CloseTab { tab_id: i32 },
    GoBack {
        tab_id_arg: Option<String>,
    },
    GoForward {
        tab_id_arg: Option<String>,
    },
    MoveTab {
        tab_id: i32,
        window_id: i32,
        index: Option<i32>,
    },
    NewTab {
        url: Option<String>,
    },
    ListTabGroups,
    GroupNew {
        tab_ids: Vec<i32>,
    },
    TabsNu,
    TabsMoveUrl { url: String },
    OpenUrlNewWindow { url: String },
    NavigateCurrentTab { url: String },
    OpenUrlNewTab { url: String },
    /// Close the BMXt window and clear the on-screen log (`chrome.*` in TS).
    ExitBmxt,
}
