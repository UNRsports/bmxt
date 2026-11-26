//! EN: On-disk / in-memory UI settings shapes (export v2 compatible).
//! JA: ディスク／メモリ上の UI 設定形（export v2 互換）。

use serde::{Deserialize, Serialize};

pub type UiLocale = String;
pub type HostUiMode = String;
pub type SearchLegendMode = String;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceLayerFile {
    #[serde(default)]
    pub fg: Option<String>,
    #[serde(default)]
    pub bg_color: Option<String>,
    #[serde(default)]
    pub font_size: Option<String>,
    #[serde(default)]
    pub font_family: Option<String>,
    #[serde(default)]
    pub bg_image_file: Option<String>,
}

impl Default for AppearanceLayerFile {
    fn default() -> Self {
        Self {
            fg: None,
            bg_color: None,
            font_size: None,
            font_family: None,
            bg_image_file: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiAppearanceFile {
    #[serde(flatten)]
    pub layer: AppearanceLayerFile,
    #[serde(default)]
    pub search_hit_highlight_bg: Option<String>,
    #[serde(default)]
    pub search_jump_highlight_bg: Option<String>,
    #[serde(default)]
    pub edit_picker: bool,
    #[serde(default)]
    pub picker: AppearanceLayerFile,
}

impl Default for UiAppearanceFile {
    fn default() -> Self {
        Self {
            layer: AppearanceLayerFile::default(),
            search_hit_highlight_bg: None,
            search_jump_highlight_bg: None,
            edit_picker: false,
            picker: AppearanceLayerFile::default(),
        }
    }
}

/// EN: Committed / draft settings (host-agnostic).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    pub locale: UiLocale,
    pub appearance: UiAppearanceFile,
    pub host_ui_mode: HostUiMode,
    pub ime_candidate_help: bool,
    #[serde(default)]
    pub prompt_fire: bool,
    pub search_legend_mode: SearchLegendMode,
}

/// EN: On-disk `settings.json` v2 (same layout as extension export).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsFileV2 {
    pub version: u32,
    pub exported_at: String,
    pub locale: UiLocale,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host_ui_mode: Option<HostUiMode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_keys_mode: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ime_candidate_help: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_fire: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub search_legend_mode: Option<SearchLegendMode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub appearance: Option<UiAppearanceFile>,
}
