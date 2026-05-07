//! dispatch の JSON 形と Effect（serde で TS と共有）。
//! `Effect` 本体は **`manifest/bmxt-codegen.json`** から生成（`generated/effect_enum.rs`）。

pub use crate::generated::Effect;

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
