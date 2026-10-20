use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{
    effects, msg_key, msg_param, msgs, msgs_with_prompt, ui, ChromeEffect, DispatchBundle, UiAction,
};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.tabs.usage.line1",
    "cmd.tabs.usage.line2",
    "cmd.tabs.usage.line3",
    "cmd.tabs.usage.line4",
    "cmd.tabs.usage.line5",
];

/** EN: Host fills this param from live UI state before expand-msgs. */
const HOST_PAGE_ACTIVE_TOKEN: &str = "__HOST_PAGE_ACTIVE__";

fn norm_tabs_flag(arg: &str) -> Option<&'static str> {
    match normalize_token(arg).as_str() {
        "-list" => Some("-list"),
        "-exit" => Some("-exit"),
        "-setting" => Some("-setting"),
        "-moveurl" => Some("-moveurl"),
        "-nowurl" => Some("-nowurl"),
        _ => None,
    }
}

fn parse_tabs_list_args(args: &[String]) -> Result<bool, ()> {
    let mut show_url = false;
    for token in args.iter().skip(2) {
        match normalize_token(token).as_str() {
            "-url" => show_url = true,
            _ => return Err(()),
        }
    }
    Ok(show_url)
}

fn usage_msgs(extra: crate::ir::Msg) -> DispatchBundle {
    let mut msgs_vec = vec![extra];
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs(msgs_vec)
}

fn run_tabs_setting(args: &[String]) -> DispatchBundle {
    if args.len() == 2 {
        return msgs_with_prompt(
            vec![
                msg_key("tabs.setting.choose"),
                msg_param(
                    "tabs.setting.pageActiveCurrent",
                    "token",
                    HOST_PAGE_ACTIVE_TOKEN,
                ),
            ],
            "tab -setting ",
        );
    }
    if args.len() == 3 {
        if normalize_token(&args[2]) != "-page-active" {
            return usage_msgs(msg_param(
                "cmd.tabs.error.unknownOption",
                "option",
                &args[2],
            ));
        }
        return msgs_with_prompt(
            vec![
                msg_param("tabs.pageActive.choose", "options", "--auto | --manual"),
                msg_param(
                    "tabs.setting.pageActiveCurrent",
                    "token",
                    HOST_PAGE_ACTIVE_TOKEN,
                ),
            ],
            "tab -setting -page-active ",
        );
    }
    if args.len() == 4 && normalize_token(&args[2]) == "-page-active" {
        let mode = match normalize_token(&args[3]).as_str() {
            "--auto" => Some("auto"),
            "--manual" => Some("manual"),
            _ => None,
        };
        if let Some(mode) = mode {
            return ui(UiAction::SetMode {
                feature_id: "tabs".to_string(),
                mode: mode.to_string(),
            });
        }
    }
    usage_msgs(msg_key("cmd.tabs.error.invalidListUsage"))
}

pub fn run(args: &[String]) -> DispatchBundle {
    if let Err(bundle) = helpers::require_second_token("tab", args, USAGE_KEYS) {
        return bundle;
    }

    let sub = norm_tabs_flag(args.get(1).map(String::as_str).unwrap_or(""));
    let Some(sub) = sub else {
        return usage_msgs(msg_key("cmd.tabs.error.internalOutOfSync"));
    };

    match sub {
        "-list" => match parse_tabs_list_args(args) {
            Ok(show_url) => effects(vec![ChromeEffect::TabsList {
                show_url: if show_url {
                    "true".to_string()
                } else {
                    "false".to_string()
                },
            }]),
            Err(()) => usage_msgs(msg_key("cmd.tabs.error.invalidListUsage")),
        },
        "-exit" => {
            if args.len() != 3 || normalize_token(&args[2]) != "-list" {
                return usage_msgs(msg_key("cmd.tabs.error.exitListUsage"));
            }
            ui(UiAction::ClosePicker {
                slot: "tabs".to_string(),
            })
        }
        "-setting" => run_tabs_setting(args),
        "-nowurl" => {
            if args.len() > 2 {
                return usage_msgs(msg_key("cmd.tabs.error.tooManyArgs"));
            }
            effects(vec![ChromeEffect::TabsNu])
        }
        "-moveurl" => {
            let url_part = args
                .iter()
                .skip(2)
                .cloned()
                .collect::<Vec<_>>()
                .join(" ")
                .trim()
                .to_string();
            if url_part.is_empty() {
                return usage_msgs(msg_key("cmd.tabs.error.usageMoveurl"));
            }
            let Some(url) = parse_http_url_candidate(&url_part) else {
                return usage_msgs(msg_key("cmd.tabs.error.usageMoveurl"));
            };
            effects(vec![ChromeEffect::TabsMoveUrl { url }])
        }
        _ => usage_msgs(msg_key("cmd.tabs.error.internalDispatchOutOfSync")),
    }
}
