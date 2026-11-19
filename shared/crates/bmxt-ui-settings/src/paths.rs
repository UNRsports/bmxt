//! EN: BMXtCLI UI settings directory (`bmxt-cli-ui-settings`).
//! JA: BMXtCLI 用 UI 設定ディレクトリ。

use std::path::PathBuf;

/// EN: Directory name under `~/.config/bmxt/` — clearly BMXtCLI-owned.
pub const BMXT_CLI_UI_SETTINGS_DIR_NAME: &str = "bmxt-cli-ui-settings";

/// EN: Optional override for the settings bundle directory.
pub const BMXT_CLI_UI_SETTINGS_DIR_ENV: &str = "BMXT_CLI_UI_SETTINGS_DIR";

pub fn cli_ui_settings_bundle_dir_name() -> &'static str {
    BMXT_CLI_UI_SETTINGS_DIR_NAME
}

/// EN: `~/.config/bmxt/bmxt-cli-ui-settings` (or platform config dir equivalent).
pub fn cli_ui_settings_dir(config_dir: &std::path::Path) -> PathBuf {
    config_dir.join(BMXT_CLI_UI_SETTINGS_DIR_NAME)
}

pub fn cli_ui_settings_path(config_dir: &std::path::Path) -> PathBuf {
    cli_ui_settings_dir(config_dir).join("settings.json")
}

/// EN: Prefer `BMXT_CLI_UI_SETTINGS_DIR`, else `<config_dir>/bmxt-cli-ui-settings`.
pub fn resolve_cli_ui_settings_dir(config_dir: &std::path::Path) -> PathBuf {
    if let Ok(override_dir) = std::env::var(BMXT_CLI_UI_SETTINGS_DIR_ENV) {
        let trimmed = override_dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    cli_ui_settings_dir(config_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn default_path_uses_cli_bundle_name() {
        let dir = cli_ui_settings_dir(Path::new("/tmp/bmxt"));
        assert_eq!(
            dir,
            PathBuf::from("/tmp/bmxt").join("bmxt-cli-ui-settings")
        );
        assert_eq!(
            cli_ui_settings_path(Path::new("/tmp/bmxt")),
            PathBuf::from("/tmp/bmxt/bmxt-cli-ui-settings/settings.json")
        );
    }
}
