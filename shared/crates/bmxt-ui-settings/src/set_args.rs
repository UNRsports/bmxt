//! EN: Closed-set parser for `setting -set <key> <value>` (match extension CUI).
//! JA: `setting -set` の閉集合パーサ（拡張 CUI と一致）。

use crate::normalize::{
    normalize_host_ui_mode, normalize_search_legend_mode, DEFAULT_HOST_UI_MODE,
};
use crate::types::{HostUiMode, SearchLegendMode, UiLocale, UiSettings};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SettingSetPatch {
    pub locale: Option<UiLocale>,
    pub edit_picker: Option<bool>,
    pub ime_candidate_help: Option<bool>,
    pub search_legend_mode: Option<SearchLegendMode>,
    pub host_ui_mode: Option<HostUiMode>,
}

fn parse_bool_token(value: &str) -> Option<bool> {
    match value.trim().to_ascii_lowercase().as_str() {
        "on" | "true" | "1" => Some(true),
        "off" | "false" | "0" => Some(false),
        _ => None,
    }
}

/// EN: Map `setting -set <key> <value>` onto a draft patch (closed key set).
pub fn setting_set_patch_from_args(key: &str, value: &str) -> Option<SettingSetPatch> {
    let k = key.trim().to_ascii_lowercase();
    let v = value.trim();
    match k.as_str() {
        "locale" => {
            if v == "ja" || v == "en" {
                Some(SettingSetPatch {
                    locale: Some(v.to_string()),
                    edit_picker: None,
                    ime_candidate_help: None,
                    search_legend_mode: None,
                    host_ui_mode: None,
                })
            } else {
                None
            }
        }
        "edit-picker" => parse_bool_token(v).map(|b| SettingSetPatch {
            locale: None,
            edit_picker: Some(b),
            ime_candidate_help: None,
            search_legend_mode: None,
            host_ui_mode: None,
        }),
        "ime-candidate-help" => parse_bool_token(v).map(|b| SettingSetPatch {
            locale: None,
            edit_picker: None,
            ime_candidate_help: Some(b),
            search_legend_mode: None,
            host_ui_mode: None,
        }),
        "search-legend" => Some(SettingSetPatch {
            locale: None,
            edit_picker: None,
            ime_candidate_help: None,
            search_legend_mode: Some(normalize_search_legend_mode(Some(v))),
            host_ui_mode: None,
        }),
        "host-ui" => {
            if v == "auto" || v == "desktop" || v == "mobile" {
                Some(SettingSetPatch {
                    locale: None,
                    edit_picker: None,
                    ime_candidate_help: None,
                    search_legend_mode: None,
                    host_ui_mode: Some(normalize_host_ui_mode(Some(v))),
                })
            } else if v == "default" {
                Some(SettingSetPatch {
                    locale: None,
                    edit_picker: None,
                    ime_candidate_help: None,
                    search_legend_mode: None,
                    host_ui_mode: Some(DEFAULT_HOST_UI_MODE.to_string()),
                })
            } else {
                None
            }
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
    if let Some(mode) = &patch.search_legend_mode {
        settings.search_legend_mode = mode.clone();
    }
    if let Some(mode) = &patch.host_ui_mode {
        settings.host_ui_mode = mode.clone();
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
    fn apply_patch_mutates_draft() {
        let mut s = default_ui_settings();
        let patch = setting_set_patch_from_args("ime-candidate-help", "off").unwrap();
        apply_setting_set_patch(&mut s, &patch);
        assert!(!s.ime_candidate_help);
    }
}
