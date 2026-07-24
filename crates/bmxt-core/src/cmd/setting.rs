use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &["cmd.setting.usage.line1", "cmd.setting.usage.line2"];

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("setting", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => ui(UiAction::OpenPlainList {
            list_id: "setting".to_string(),
            line: "setting -list".to_string(),
        }),
        "-exit" => ui(UiAction::ClosePicker {
            slot: "setting".to_string(),
        }),
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
