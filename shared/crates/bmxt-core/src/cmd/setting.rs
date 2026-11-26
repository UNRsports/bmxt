use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.setting.usage.line1",
    "cmd.setting.usage.line2",
    "cmd.setting.usage.line3",
    "cmd.setting.usage.line4",
    "cmd.setting.usage.line5",
    "cmd.setting.usage.line6",
    "cmd.setting.usage.line7",
    "cmd.setting.usage.line8",
];

fn require_no_extra(args: &[String], option: &str) -> Result<(), DispatchBundle> {
    if args.len() != 2 {
        let mut msgs_vec = vec![msg_param("cmd.setting.error.extraArgs", "option", option)];
        for key in USAGE_KEYS {
            msgs_vec.push(msg_key(key));
        }
        return Err(msgs(msgs_vec));
    }
    Ok(())
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("setting", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => ui(UiAction::OpenPlainList {
            list_id: "setting".to_string(),
            line: "setting -list".to_string(),
            show_url: "false".to_string(),
            device_scope: "local".to_string(),
            device_id: String::new(),
        }),
        "-exit" => ui(UiAction::ClosePicker {
            slot: "setting".to_string(),
        }),
        "-save" => {
            if let Err(bundle) = require_no_extra(args, "-save") {
                return bundle;
            }
            ui(UiAction::SettingSave)
        }
        "-cancel" => {
            if let Err(bundle) = require_no_extra(args, "-cancel") {
                return bundle;
            }
            ui(UiAction::SettingCancel)
        }
        "-export" => {
            if let Err(bundle) = require_no_extra(args, "-export") {
                return bundle;
            }
            ui(UiAction::SettingExport)
        }
        "-import" => {
            if let Err(bundle) = require_no_extra(args, "-import") {
                return bundle;
            }
            ui(UiAction::SettingImport)
        }
        "-bg-import" => {
            let third = args
                .get(2)
                .map(|s| s.as_str().trim().to_ascii_lowercase())
                .unwrap_or_default();
            if args.len() > 3 {
                return msgs(vec![msg_key("cmd.setting.error.bgImportUsage")]);
            }
            let layer = if third.is_empty() {
                "terminal".to_string()
            } else if third == "--picker" {
                "picker".to_string()
            } else {
                return msgs(vec![msg_key("cmd.setting.error.bgImportUsage")]);
            };
            ui(UiAction::SettingBgImport { layer })
        }
        "-reset-default" => {
            if let Err(bundle) = require_no_extra(args, "-reset-default") {
                return bundle;
            }
            ui(UiAction::SettingResetDefault)
        }
        "-storage" => {
            let mode = args
                .get(2)
                .map(|s| s.as_str().trim().to_ascii_lowercase())
                .unwrap_or_default();
            if args.len() != 3 || (mode != "internal" && mode != "external") {
                return msgs(vec![msg_key("cmd.setting.error.storageUsage")]);
            }
            ui(UiAction::SettingStorage { mode })
        }
        "-pick-dir" => {
            if let Err(bundle) = require_no_extra(args, "-pick-dir") {
                return bundle;
            }
            ui(UiAction::SettingPickDir)
        }
        "-reload" => {
            if let Err(bundle) = require_no_extra(args, "-reload") {
                return bundle;
            }
            ui(UiAction::SettingReload)
        }
        "-snapshot-storage" => {
            let mode = args
                .get(2)
                .map(|s| s.as_str().trim().to_ascii_lowercase())
                .unwrap_or_default();
            if args.len() != 3 || (mode != "bundled" && mode != "vault") {
                return msgs(vec![msg_key("cmd.setting.error.snapshotStorageUsage")]);
            }
            ui(UiAction::SettingSnapshotStorage { mode })
        }
        "-snapshot-pick-dir" => {
            if let Err(bundle) = require_no_extra(args, "-snapshot-pick-dir") {
                return bundle;
            }
            ui(UiAction::SettingSnapshotPickDir)
        }
        "-sync-guide" => {
            if let Err(bundle) = require_no_extra(args, "-sync-guide") {
                return bundle;
            }
            msgs(vec![
                msg_key("setting.picker.syncSetupGuide.line1"),
                msg_key("setting.picker.syncSetupGuide.line2"),
                msg_key("setting.picker.syncSetupGuide.line3"),
                msg_key("setting.picker.syncSetupGuide.line4"),
            ])
        }
        "-set" => {
            let key = args.get(2).map(String::as_str).unwrap_or("").trim();
            if key.is_empty() || key.len() > 64 {
                return msgs(vec![msg_key("cmd.setting.error.setUsage")]);
            }
            if !key
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
            {
                return msgs(vec![msg_key("cmd.setting.error.setUsage")]);
            }
            let value = args
                .iter()
                .skip(3)
                .cloned()
                .collect::<Vec<_>>()
                .join(" ");
            if value.len() > 512 {
                return msgs(vec![msg_key("cmd.setting.error.setUsage")]);
            }
            ui(UiAction::SettingSet {
                key: key.to_string(),
                value,
            })
        }
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            let mut msgs_vec = vec![msg_param("cmd.setting.error.internal", "option", option)];
            for key in USAGE_KEYS {
                msgs_vec.push(msg_key(key));
            }
            msgs(msgs_vec)
        }
    }
}
