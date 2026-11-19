//! EN: BMXtCLI host helpers for UI settings load/save path and draft apply.
//! JA: BMXtCLI の UI 設定パス・下書き適用ヘルパ。

use std::path::PathBuf;

use anyhow::{Context, Result};
use bmxt_ui_settings::{
    apply_setting_set_patch, format_setting_list_lines, load_if_present, load_or_default,
    resolve_cli_ui_settings_dir, save_ui_settings, setting_set_patch_from_args, UiSettings,
};

use crate::config::CliConfig;
use crate::msgs::{resolve_cli_locale, set_runtime_locale, t_cli};

pub fn settings_json_path() -> Result<PathBuf> {
    let config_dir = CliConfig::config_dir()?;
    let dir = resolve_cli_ui_settings_dir(&config_dir);
    Ok(dir.join("settings.json"))
}

pub fn load_committed() -> Result<UiSettings> {
    let path = settings_json_path()?;
    load_or_default(&path).with_context(|| format!("load {}", path.display()))
}

/**
 * EN: Install runtime locale. Missing settings file → env only (do not treat defaults as committed).
 * JA: ランタイム locale を入れる。settings 未作成時は env のみ（既定 ja を committed 扱いしない）。
 */
pub fn bootstrap_locale() -> Result<()> {
    let path = settings_json_path()?;
    let committed = load_if_present(&path).with_context(|| format!("load {}", path.display()))?;
    let locale = match &committed {
        Some(settings) => resolve_cli_locale(Some(settings.locale.as_str())),
        None => resolve_cli_locale(None),
    };
    set_runtime_locale(&locale);
    Ok(())
}

pub fn save_committed(settings: &UiSettings) -> Result<()> {
    let path = settings_json_path()?;
    save_ui_settings(&path, settings).with_context(|| format!("save {}", path.display()))?;
    set_runtime_locale(&settings.locale);
    Ok(())
}

pub fn print_setting_list(settings: &UiSettings, cfg: &crate::config::CliConfig) {
    println!("{}", t_cli("setting.list.notice.showing", &[]));
    println!("{}", t_cli("setting.list.notice.useBrowse", &[]));
    println!("{}", t_cli("cmd.cli.setting.useSetSave", &[]));
    for line in format_setting_list_lines(settings) {
        println!("{line}");
    }
    let delivery = cfg
        .handshake_delivery
        .as_deref()
        .unwrap_or("ask");
    let ticket_dir = cfg
        .handshake_ticket_dir
        .as_deref()
        .unwrap_or("(default ~/.config/bmxt)");
    println!("handshake-delivery\t{delivery}");
    println!("handshake-ticket-dir\t{ticket_dir}");
}

/**
 * EN: CLI-only sync prefs on `CliConfig` (immediate save; not UI settings draft).
 * JA: CLI 専用の sync 設定（即時保存。UI settings 下書きではない）。
 */
pub fn try_apply_cli_sync_setting(
    cfg: &mut crate::config::CliConfig,
    key: &str,
    value: &str,
) -> Result<Option<()>> {
    let k = key.trim().to_ascii_lowercase();
    match k.as_str() {
        "handshake-delivery" => {
            match crate::handshake_delivery::set_delivery_mode(cfg, value)? {
                crate::handshake_delivery::DeliverySettingResult::AskNextTime => {
                    println!("{}", t_cli("cmd.cli.handshake.deliveryAskNext", &[]));
                }
                crate::handshake_delivery::DeliverySettingResult::Mode(mode) => {
                    println!(
                        "{}",
                        t_cli(
                            "cmd.cli.handshake.deliveryRemembered",
                            &[(
                                "mode",
                                crate::handshake_delivery::delivery_token(mode)
                            )]
                        )
                    );
                }
            }
            Ok(Some(()))
        }
        "handshake-ticket-dir" => {
            let dir = crate::handshake_delivery::set_ticket_dir(cfg, value)?;
            println!(
                "{}",
                t_cli(
                    "cmd.cli.handshake.ticketDirRemembered",
                    &[("dir", &dir.display().to_string())]
                )
            );
            Ok(Some(()))
        }
        _ => Ok(None),
    }
}

pub fn apply_set_to_draft(
    draft: &mut Option<UiSettings>,
    committed: &UiSettings,
    key: &str,
    value: &str,
) -> Result<bool> {
    let patch = match setting_set_patch_from_args(key, value) {
        Some(p) => p,
        None => {
            println!(
                "{}",
                t_cli("setting.cui.setUnknown", &[("key", key)])
            );
            return Ok(false);
        }
    };
    let target = draft.get_or_insert_with(|| committed.clone());
    apply_setting_set_patch(target, &patch);
    println!(
        "{}",
        t_cli(
            "setting.cui.setApplied",
            &[("key", key), ("value", value)]
        )
    );
    Ok(true)
}
