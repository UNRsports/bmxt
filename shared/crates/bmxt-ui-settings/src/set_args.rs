//! EN: Closed-set parser for `setting -set <key> <value>` (match extension CUI).
//! JA: `setting -set` の閉集合パーサ（拡張 CUI と一致）。

use crate::normalize::{
    normalize_host_ui_mode, normalize_search_legend_mode, DEFAULT_HOST_UI_MODE,
};
use crate::types::{HostUiMode, SearchLegendMode, UiLocale, UiSettings};

/**
 * EN: Closed key tokens for `setting -set` candidates (order = menu order; match extension TS).
 * JA: `setting -set` 候補キー（並び＝メニュー順。拡張 TS と一致）。
 */
pub const SETTING_SET_KEY_TOKENS: &[&str] = &[
    "locale",
    "edit-picker",
    "ime-candidate-help",
    "prompt-fire",
    "search-legend",
    "host-ui",
    "fg",
    "bg-color",
    "size",
    "font",
    "search-hit-highlight",
    "search-jump-highlight",
    "picker-fg",
    "picker-bg-color",
    "picker-size",
    "picker-font",
    "sync-hold-ms",
    "cli-door-retry-ms",
    "bg-image",
    "picker-bg-image",
];

const SETTING_SET_BOOL_VALUE_TOKENS: &[&str] = &["on", "off"];
const SETTING_SET_CLEAR_VALUE_TOKENS: &[&str] = &["default", "reset"];
const SETTING_SET_LOCALE_VALUE_TOKENS: &[&str] = &["ja", "en"];
const SETTING_SET_HOST_UI_VALUE_TOKENS: &[&str] = &["auto", "desktop", "mobile", "default"];
const SETTING_SET_SEARCH_LEGEND_VALUE_TOKENS: &[&str] = &["text", "emoji", "text_emoji"];
const SETTING_SET_TIMING_VALUE_TOKENS: &[&str] = &["default"];

/**
 * EN: Discrete value tokens for `setting -set <key> ` (null = free-form / unknown key).
 * JA: `setting -set <key> ` の離散値候補（不明キーは null）。
 */
pub fn setting_set_value_candidates(key: &str) -> Option<&'static [&'static str]> {
    match key.trim().to_ascii_lowercase().as_str() {
        "locale" => Some(SETTING_SET_LOCALE_VALUE_TOKENS),
        "edit-picker" | "ime-candidate-help" | "prompt-fire" => Some(SETTING_SET_BOOL_VALUE_TOKENS),
        "search-legend" => Some(SETTING_SET_SEARCH_LEGEND_VALUE_TOKENS),
        "host-ui" => Some(SETTING_SET_HOST_UI_VALUE_TOKENS),
        "sync-hold-ms" | "cli-door-retry-ms" => Some(SETTING_SET_TIMING_VALUE_TOKENS),
        "fg" | "bg-color" | "size" | "font" | "search-hit-highlight" | "search-jump-highlight"
        | "picker-fg" | "picker-bg-color" | "picker-size" | "picker-font" | "bg-image"
        | "picker-bg-image" => Some(SETTING_SET_CLEAR_VALUE_TOKENS),
        _ => None,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct SettingSetPatch {
    pub locale: Option<UiLocale>,
    pub edit_picker: Option<bool>,
    pub ime_candidate_help: Option<bool>,
    pub prompt_fire: Option<bool>,
    pub search_legend_mode: Option<SearchLegendMode>,
    pub host_ui_mode: Option<HostUiMode>,
    pub fg: Option<OptionalString>,
    pub bg_color: Option<OptionalString>,
    pub font_size: Option<OptionalString>,
    pub font_family: Option<OptionalString>,
    pub search_hit_highlight_bg: Option<OptionalString>,
    pub search_jump_highlight_bg: Option<OptionalString>,
    pub picker_fg: Option<OptionalString>,
    pub picker_bg_color: Option<OptionalString>,
    pub picker_font_size: Option<OptionalString>,
    pub picker_font_family: Option<OptionalString>,
}

/// EN: Explicit set-or-clear for nullable appearance fields.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OptionalString {
    Clear,
    Value(String),
}

fn parse_bool_token(value: &str) -> Option<bool> {
    match value.trim().to_ascii_lowercase().as_str() {
        "on" | "true" | "1" => Some(true),
        "off" | "false" | "0" => Some(false),
        _ => None,
    }
}

fn is_clear_token(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "" | "default" | "null" | "reset"
    )
}

fn expand_hex_digits(digits: &str) -> Option<String> {
    match digits.len() {
        3 => Some(
            digits
                .chars()
                .flat_map(|c| [c, c])
                .collect::<String>()
                .to_ascii_lowercase(),
        ),
        6 => Some(digits.to_ascii_lowercase()),
        8 => Some(digits[..6].to_ascii_lowercase()),
        _ => None,
    }
}

fn parse_hex_color(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if !trimmed.starts_with('#') {
        return None;
    }
    let digits = &trimmed[1..];
    if !digits.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let expanded = expand_hex_digits(digits)?;
    if expanded.len() != 6 {
        return None;
    }
    Some(format!("#{expanded}"))
}

fn parse_optional_hex(value: &str) -> Option<OptionalString> {
    if is_clear_token(value) {
        return Some(OptionalString::Clear);
    }
    parse_hex_color(value).map(OptionalString::Value)
}

fn parse_font_size_px(raw: &str) -> Option<String> {
    let trimmed = raw.trim().to_ascii_lowercase();
    let digits = trimmed.strip_suffix("px").unwrap_or(trimmed.as_str());
    let n: u32 = digits.parse().ok()?;
    if (8..=32).contains(&n) {
        Some(format!("{n}px"))
    } else {
        None
    }
}

fn parse_optional_font_size(value: &str) -> Option<OptionalString> {
    if is_clear_token(value) {
        return Some(OptionalString::Clear);
    }
    parse_font_size_px(value).map(OptionalString::Value)
}

fn parse_font_family(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > 200 {
        return None;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '-' | ',' | '\'' | '"'))
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn parse_optional_font_family(value: &str) -> Option<OptionalString> {
    if is_clear_token(value) {
        return Some(OptionalString::Clear);
    }
    parse_font_family(value).map(OptionalString::Value)
}

fn apply_optional(target: &mut Option<String>, value: &OptionalString) {
    match value {
        OptionalString::Clear => *target = None,
        OptionalString::Value(v) => *target = Some(v.clone()),
    }
}

/// EN: Map `setting -set <key> <value>` onto a settings patch (closed key set).
pub fn setting_set_patch_from_args(key: &str, value: &str) -> Option<SettingSetPatch> {
    let k = key.trim().to_ascii_lowercase();
    let v = value.trim();
    let mut patch = SettingSetPatch::default();
    match k.as_str() {
        "locale" => {
            if v == "ja" || v == "en" {
                patch.locale = Some(v.to_string());
                Some(patch)
            } else {
                None
            }
        }
        "edit-picker" => {
            patch.edit_picker = Some(parse_bool_token(v)?);
            Some(patch)
        }
        "ime-candidate-help" => {
            patch.ime_candidate_help = Some(parse_bool_token(v)?);
            Some(patch)
        }
        "prompt-fire" => {
            patch.prompt_fire = Some(parse_bool_token(v)?);
            Some(patch)
        }
        "search-legend" => {
            patch.search_legend_mode = Some(normalize_search_legend_mode(Some(v)));
            Some(patch)
        }
        "host-ui" => {
            if v == "auto" || v == "desktop" || v == "mobile" {
                patch.host_ui_mode = Some(normalize_host_ui_mode(Some(v)));
                Some(patch)
            } else if v == "default" {
                patch.host_ui_mode = Some(DEFAULT_HOST_UI_MODE.to_string());
                Some(patch)
            } else {
                None
            }
        }
        "fg" => {
            patch.fg = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "bg-color" => {
            patch.bg_color = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "size" => {
            patch.font_size = Some(parse_optional_font_size(v)?);
            Some(patch)
        }
        "font" => {
            patch.font_family = Some(parse_optional_font_family(v)?);
            Some(patch)
        }
        "search-hit-highlight" => {
            patch.search_hit_highlight_bg = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "search-jump-highlight" => {
            patch.search_jump_highlight_bg = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "picker-fg" => {
            patch.picker_fg = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "picker-bg-color" => {
            patch.picker_bg_color = Some(parse_optional_hex(v)?);
            Some(patch)
        }
        "picker-size" => {
            patch.picker_font_size = Some(parse_optional_font_size(v)?);
            Some(patch)
        }
        "picker-font" => {
            patch.picker_font_family = Some(parse_optional_font_family(v)?);
            Some(patch)
        }
        _ => None,
    }
}

pub fn apply_setting_set_patch(settings: &mut UiSettings, patch: &SettingSetPatch) {
    if let Some(locale) = &patch.locale {
        settings.locale = locale.clone();
    }
    if let Some(edit_picker) = patch.edit_picker {
        settings.appearance.edit_picker = edit_picker;
    }
    if let Some(ime) = patch.ime_candidate_help {
        settings.ime_candidate_help = ime;
    }
    if let Some(fire) = patch.prompt_fire {
        settings.prompt_fire = fire;
    }
    if let Some(mode) = &patch.search_legend_mode {
        settings.search_legend_mode = mode.clone();
    }
    if let Some(mode) = &patch.host_ui_mode {
        settings.host_ui_mode = mode.clone();
    }
    if let Some(v) = &patch.fg {
        apply_optional(&mut settings.appearance.layer.fg, v);
    }
    if let Some(v) = &patch.bg_color {
        apply_optional(&mut settings.appearance.layer.bg_color, v);
    }
    if let Some(v) = &patch.font_size {
        apply_optional(&mut settings.appearance.layer.font_size, v);
    }
    if let Some(v) = &patch.font_family {
        apply_optional(&mut settings.appearance.layer.font_family, v);
    }
    if let Some(v) = &patch.search_hit_highlight_bg {
        apply_optional(&mut settings.appearance.search_hit_highlight_bg, v);
    }
    if let Some(v) = &patch.search_jump_highlight_bg {
        apply_optional(&mut settings.appearance.search_jump_highlight_bg, v);
    }
    if let Some(v) = &patch.picker_fg {
        apply_optional(&mut settings.appearance.picker.fg, v);
    }
    if let Some(v) = &patch.picker_bg_color {
        apply_optional(&mut settings.appearance.picker.bg_color, v);
    }
    if let Some(v) = &patch.picker_font_size {
        apply_optional(&mut settings.appearance.picker.font_size, v);
    }
    if let Some(v) = &patch.picker_font_family {
        apply_optional(&mut settings.appearance.picker.font_family, v);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::normalize::default_ui_settings;

    #[test]
    fn set_locale_and_host_ui() {
        let patch = setting_set_patch_from_args("locale", "en").unwrap();
        assert_eq!(patch.locale.as_deref(), Some("en"));
        let patch = setting_set_patch_from_args("host-ui", "desktop").unwrap();
        assert_eq!(patch.host_ui_mode.as_deref(), Some("desktop"));
        assert!(setting_set_patch_from_args("host-ui", "popup").is_none());
    }

    #[test]
    fn apply_patch_mutates_settings() {
        let mut s = default_ui_settings();
        let patch = setting_set_patch_from_args("ime-candidate-help", "off").unwrap();
        apply_setting_set_patch(&mut s, &patch);
        assert!(!s.ime_candidate_help);
        let patch = setting_set_patch_from_args("prompt-fire", "on").unwrap();
        apply_setting_set_patch(&mut s, &patch);
        assert!(s.prompt_fire);
        let patch = setting_set_patch_from_args("fg", "#abc").unwrap();
        apply_setting_set_patch(&mut s, &patch);
        assert_eq!(s.appearance.layer.fg.as_deref(), Some("#aabbcc"));
        let patch = setting_set_patch_from_args("fg", "default").unwrap();
        apply_setting_set_patch(&mut s, &patch);
        assert_eq!(s.appearance.layer.fg, None);
    }
}
