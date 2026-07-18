use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{
    msg_key, msg_param, msgs, msgs_with_prompt, ui, DispatchBundle, UiAction,
};

const USAGE_KEYS: &[&str] = &[
    "cmd.translate.usage.line1",
    "cmd.translate.usage.line2",
    "cmd.translate.usage.line3",
    "cmd.translate.usage.detail",
];

const HOST_PAIR_TOKEN: &str = "__HOST_TRANSLATE_PAIR__";

fn usage_msgs(extra: crate::ir::Msg) -> DispatchBundle {
    let mut msgs_vec = vec![extra];
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs(msgs_vec)
}

fn run_translate_setting(args: &[String]) -> DispatchBundle {
    if args.len() == 2 {
        return msgs_with_prompt(
            vec![
                msg_param(
                    "translate.setting.choose",
                    "options",
                    "--ja-en | --en-ja",
                ),
                msg_param("setting.language.current", "token", HOST_PAIR_TOKEN),
            ],
            "translate -setting ",
        );
    }
    if args.len() == 3 {
        let pair = match normalize_token(&args[2]).as_str() {
            "--ja-en" => Some("ja-en"),
            "--en-ja" => Some("en-ja"),
            _ => None,
        };
        if let Some(pair) = pair {
            return ui(UiAction::TranslateSetting {
                pair: pair.to_string(),
            });
        }
    }
    usage_msgs(msg_param(
        "cmd.translate.error.unknownOption",
        "option",
        args.get(2).map(String::as_str).unwrap_or(""),
    ))
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("translate", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-on" => ui(UiAction::TranslateOn),
        "-off" => ui(UiAction::TranslateOff),
        "-setting" => run_translate_setting(args),
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            usage_msgs(msg_param("cmd.translate.error.internal", "option", option))
        }
    }
}
