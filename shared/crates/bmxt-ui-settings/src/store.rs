//! EN: Load / save `settings.json` under the BMXtCLI bundle directory.
//! JA: BMXtCLI バンドル配下の `settings.json` 読み書き。

use std::fs;
use std::path::{Path, PathBuf};

use thiserror::Error;

use crate::normalize::{default_ui_settings, normalize_ui_settings};
use crate::types::{SettingsFileV2, UiSettings};

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("unsupported settings version: {0}")]
    UnsupportedVersion(u32),
}

fn extra_keys_as_str(value: &Option<serde_json::Value>) -> Option<&str> {
    value.as_ref().and_then(|v| v.as_str())
}

pub fn settings_from_file(file: SettingsFileV2) -> Result<UiSettings, StoreError> {
    if file.version != 1 && file.version != 2 {
        return Err(StoreError::UnsupportedVersion(file.version));
    }
    Ok(normalize_ui_settings(
        Some(file.locale.as_str()),
        file.host_ui_mode.as_deref(),
        extra_keys_as_str(&file.extra_keys_mode),
        file.ime_candidate_help,
        file.search_legend_mode.as_deref(),
        file.appearance.as_ref(),
    ))
}

pub fn settings_to_file(settings: &UiSettings) -> SettingsFileV2 {
    SettingsFileV2 {
        version: 2,
        exported_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        locale: settings.locale.clone(),
        host_ui_mode: Some(settings.host_ui_mode.clone()),
        extra_keys_mode: None,
        ime_candidate_help: Some(settings.ime_candidate_help),
        search_legend_mode: Some(settings.search_legend_mode.clone()),
        appearance: Some(settings.appearance.clone()),
    }
}

/// EN: Load settings.json when present; `None` if the file does not exist yet.
pub fn load_if_present(settings_path: &Path) -> Result<Option<UiSettings>, StoreError> {
    if !settings_path.is_file() {
        return Ok(None);
    }
    let raw = fs::read_to_string(settings_path)?;
    let file: SettingsFileV2 = serde_json::from_str(&raw)?;
    Ok(Some(settings_from_file(file)?))
}

/// EN: Load settings.json; missing file → defaults (does not create the file).
pub fn load_or_default(settings_path: &Path) -> Result<UiSettings, StoreError> {
    Ok(load_if_present(settings_path)?.unwrap_or_else(default_ui_settings))
}

pub fn save_ui_settings(settings_path: &Path, settings: &UiSettings) -> Result<(), StoreError> {
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let file = settings_to_file(settings);
    let raw = serde_json::to_string_pretty(&file)?;
    let tmp: PathBuf = settings_path.with_extension("json.tmp");
    fs::write(&tmp, raw)?;
    fs::rename(&tmp, settings_path)?;
    Ok(())
}

/// EN: Plain-list lines for `setting -list` (scalar fields; no save/cancel rows).
pub fn format_setting_list_lines(settings: &UiSettings) -> Vec<String> {
    let edit_picker = if settings.appearance.edit_picker {
        "on"
    } else {
        "off"
    };
    let ime = if settings.ime_candidate_help {
        "on"
    } else {
        "off"
    };
    vec![
        format!("locale\t{}", settings.locale),
        format!("edit-picker\t{edit_picker}"),
        format!("ime-candidate-help\t{ime}"),
        format!("search-legend\t{}", settings.search_legend_mode),
        format!("host-ui\t{}", settings.host_ui_mode),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::normalize::default_ui_settings;
    use crate::set_args::{apply_setting_set_patch, setting_set_patch_from_args};

    #[test]
    fn round_trip_save_load() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut settings = default_ui_settings();
        let patch = setting_set_patch_from_args("locale", "en").unwrap();
        apply_setting_set_patch(&mut settings, &patch);
        save_ui_settings(&path, &settings).unwrap();
        let loaded = load_or_default(&path).unwrap();
        assert_eq!(loaded.locale, "en");
        assert_eq!(loaded.host_ui_mode, "auto");
    }

    #[test]
    fn missing_file_returns_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("missing.json");
        let loaded = load_or_default(&path).unwrap();
        assert_eq!(loaded.locale, "ja");
    }
}
