use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.setting.usage.line1",
    "cmd.setting.usage.line2",
    "cmd.setting.usage.line3",
    "cmd.setting.usage.line4",
    "cmd.setting.usage.line5",
];

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
            if args.len() != 2 {
                return msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect());
            }
            ui(UiAction::SettingSave)
        }
        "-cancel" => {
            if args.len() != 2 {
                return msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect());
            }
            ui(UiAction::SettingCancel)
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
