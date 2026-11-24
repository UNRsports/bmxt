//! EN: Normalize partial / legacy settings (match extension TS semantics).
//! JA: 部分・レガシー設定の正規化（拡張 TS と意味を揃える）。

use crate::types::{
    AppearanceLayerFile, HostUiMode, SearchLegendMode, UiAppearanceFile, UiLocale, UiSettings,
};

pub const DEFAULT_UI_LOCALE: &str = "ja";
pub const DEFAULT_HOST_UI_MODE: &str = "auto";
pub const DEFAULT_IME_CANDIDATE_HELP: bool = true;
pub const DEFAULT_PROMPT_FIRE: bool = false;
pub const DEFAULT_SEARCH_LEGEND_MODE: &str = "text";

pub fn parse_ui_locale(raw: Option<&str>) -> UiLocale {
    match raw {
        Some("en") => "en".to_string(),
        _ => DEFAULT_UI_LOCALE.to_string(),
    }
}

pub fn normalize_host_ui_mode(raw: Option<&str>) -> HostUiMode {
    match raw {
        Some("auto") | Some("desktop") | Some("mobile") => raw.unwrap().to_string(),
        // EN: Legacy extraKeysMode from early 0.8.2.
        Some("on") => "mobile".to_string(),
        Some("off") => "desktop".to_string(),
        _ => DEFAULT_HOST_UI_MODE.to_string(),
    }
}

pub fn normalize_search_legend_mode(raw: Option<&str>) -> SearchLegendMode {
    match raw {
        Some("text") | Some("emoji") | Some("text_emoji") => raw.unwrap().to_string(),
        _ => DEFAULT_SEARCH_LEGEND_MODE.to_string(),
    }
}

fn normalize_layer(raw: Option<&AppearanceLayerFile>) -> AppearanceLayerFile {
    match raw {
        Some(layer) => AppearanceLayerFile {
            fg: layer.fg.clone(),
            bg_color: layer.bg_color.clone(),
            font_size: layer.font_size.clone(),
            font_family: layer.font_family.clone(),
            bg_image_file: layer.bg_image_file.clone(),
        },
        None => AppearanceLayerFile::default(),
    }
}

fn normalize_appearance(raw: Option<&UiAppearanceFile>) -> UiAppearanceFile {
    match raw {
        Some(a) => UiAppearanceFile {
            layer: normalize_layer(Some(&a.layer)),
            search_hit_highlight_bg: a.search_hit_highlight_bg.clone(),
            search_jump_highlight_bg: a.search_jump_highlight_bg.clone(),
            edit_picker: a.edit_picker,
            picker: normalize_layer(Some(&a.picker)),
        },
        None => UiAppearanceFile::default(),
    }
}

pub fn default_ui_settings() -> UiSettings {
    UiSettings {
        locale: DEFAULT_UI_LOCALE.to_string(),
        appearance: UiAppearanceFile::default(),
        host_ui_mode: DEFAULT_HOST_UI_MODE.to_string(),
        ime_candidate_help: DEFAULT_IME_CANDIDATE_HELP,
        prompt_fire: DEFAULT_PROMPT_FIRE,
        search_legend_mode: DEFAULT_SEARCH_LEGEND_MODE.to_string(),
    }
}

/// EN: Build committed settings from optional fields / file partials.
pub fn normalize_ui_settings(
    locale: Option<&str>,
    host_ui_mode: Option<&str>,
    extra_keys_mode: Option<&str>,
    ime_candidate_help: Option<bool>,
    prompt_fire: Option<bool>,
    search_legend_mode: Option<&str>,
    appearance: Option<&UiAppearanceFile>,
) -> UiSettings {
    let host = if host_ui_mode.is_some() {
        normalize_host_ui_mode(host_ui_mode)
    } else if extra_keys_mode.is_some() {
        normalize_host_ui_mode(extra_keys_mode)
    } else {
        DEFAULT_HOST_UI_MODE.to_string()
    };
    UiSettings {
        locale: parse_ui_locale(locale),
        appearance: normalize_appearance(appearance),
        host_ui_mode: host,
        ime_candidate_help: ime_candidate_help.unwrap_or(DEFAULT_IME_CANDIDATE_HELP),
        prompt_fire: prompt_fire.unwrap_or(DEFAULT_PROMPT_FIRE),
        search_legend_mode: normalize_search_legend_mode(search_legend_mode),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn locale_defaults_to_ja() {
        assert_eq!(parse_ui_locale(None), "ja");
        assert_eq!(parse_ui_locale(Some("en")), "en");
        assert_eq!(parse_ui_locale(Some("fr")), "ja");
    }

    #[test]
    fn host_ui_accepts_current_and_legacy() {
        assert_eq!(normalize_host_ui_mode(Some("desktop")), "desktop");
        assert_eq!(normalize_host_ui_mode(Some("on")), "mobile");
        assert_eq!(normalize_host_ui_mode(Some("off")), "desktop");
        assert_eq!(normalize_host_ui_mode(Some("popup")), "auto");
    }
}
