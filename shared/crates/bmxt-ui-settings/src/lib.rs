//! EN: Portable UI settings (`settings.json` v2) for BMXtCLI and shared contract.
//! JA: BMXtCLI 向けポータブル UI 設定（`settings.json` v2）と共有契約。

mod normalize;
mod paths;
mod set_args;
mod store;
mod types;

pub use normalize::{
    default_ui_settings, normalize_host_ui_mode, normalize_search_legend_mode, normalize_ui_settings,
    parse_ui_locale, DEFAULT_HOST_UI_MODE, DEFAULT_IME_CANDIDATE_HELP, DEFAULT_PROMPT_FIRE,
    DEFAULT_SEARCH_LEGEND_MODE, DEFAULT_UI_LOCALE,
};
pub use paths::{
    cli_ui_settings_bundle_dir_name, cli_ui_settings_dir, cli_ui_settings_path,
    resolve_cli_ui_settings_dir, BMXT_CLI_UI_SETTINGS_DIR_ENV, BMXT_CLI_UI_SETTINGS_DIR_NAME,
};
pub use set_args::{
    apply_setting_set_patch, setting_set_patch_from_args, setting_set_value_candidates,
    SettingSetPatch, SETTING_SET_KEY_TOKENS,
};
pub use store::{
    format_setting_list_lines, load_if_present, load_or_default, save_ui_settings, StoreError,
};
pub use types::{
    AppearanceLayerFile, HostUiMode, SearchLegendMode, SettingsFileV2, UiAppearanceFile, UiLocale,
    UiSettings,
};
