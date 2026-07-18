use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.translate.usage.line1",
    "cmd.translate.usage.line2",
    "cmd.translate.usage.line3",
    "cmd.translate.usage.detail",
];

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("translate", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-on" => ui(UiAction::TranslateOn),
        "-off" => ui(UiAction::TranslateOff),
        "-setting" => ui(UiAction::TranslateSetting),
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            let mut msgs_vec = vec![msg_param("cmd.translate.error.internal", "option", option)];
            for key in USAGE_KEYS {
                msgs_vec.push(msg_key(key));
            }
            msgs(msgs_vec)
        }
    }
}
