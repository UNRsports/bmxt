use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.nav.usage.line1",
    "cmd.nav.usage.line2",
    "cmd.nav.usage.altToggle",
    "cmd.nav.usage.navTyping",
    "cmd.nav.usage.controls",
];

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("nav", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-enter" => ui(UiAction::NavArm),
        "-exit" => ui(UiAction::NavDisarm),
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            let mut msgs_vec = vec![msg_param("cmd.nav.error.internal", "option", option)];
            for key in USAGE_KEYS {
                msgs_vec.push(msg_key(key));
            }
            msgs(msgs_vec)
        }
    }
}
