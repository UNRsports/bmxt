use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{
    effects, msg_key, msg_param, msgs, msgs_with_prompt, ui, HostEffect, DispatchBundle, UiAction,
};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.tabs.usage.line1",
    "cmd.tabs.usage.line2",
    "cmd.tabs.usage.line3",
    "cmd.tabs.usage.line4",
    "cmd.tabs.usage.line5",
    "cmd.tabs.usage.line6",
];

/** EN: Host fills this param from live UI state before expand-msgs. */
const HOST_PAGE_ACTIVE_TOKEN: &str = "__HOST_PAGE_ACTIVE__";

const MAX_DEVICE_ID_LEN: usize = 64;
const MAX_SEND_PAYLOAD_LEN: usize = 8192;

fn norm_tabs_flag(arg: &str) -> Option<&'static str> {
    match normalize_token(arg).as_str() {
        "-list" => Some("-list"),
        "-exit" => Some("-exit"),
        "-setting" => Some("-setting"),
        "-moveurl" => Some("-moveurl"),
        "-nowurl" => Some("-nowurl"),
        "-send" => Some("-send"),
        _ => None,
    }
}

fn sanitize_device_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_DEVICE_ID_LEN {
        return None;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return None;
    }
    Some(trimmed.to_string())
}

/// EN: Validate `tab -list` flags; host parses scope from the echoed line.
fn parse_tabs_list_args(args: &[String]) -> Result<(), ()> {
    let mut device_scope = "local";
    let mut i = 2usize;
    while i < args.len() {
        let token = normalize_token(&args[i]);
        if token == "-url" {
            i += 1;
            continue;
        }
        if token == "--peers" {
            if device_scope != "local" {
                return Err(());
            }
            device_scope = "peers";
            i += 1;
            continue;
        }
        if token == "--device" {
            if device_scope != "local" {
                return Err(());
            }
            let Some(id) = args.get(i + 1) else {
                return Err(());
            };
            let trimmed = id.trim();
            if trimmed.is_empty() || trimmed.starts_with('-') {
                return Err(());
            }
            device_scope = "device";
            i += 2;
            continue;
        }
        return Err(());
    }
    Ok(())
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
        // EN: Plain tab -list runs on the BMXt UI (same document as WebRTC sync).
        // JA: plain tab -list は WebRTC sync と同じ BMXt UI ドキュメントで実行する。
        "-list" => match parse_tabs_list_args(args) {
            Ok(()) => ui(UiAction::OpenPlainList {
                list_id: "tabs".to_string(),
                line: args.join(" "),
            }),
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
            effects(vec![HostEffect::TabsNu])
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
            effects(vec![HostEffect::TabsMoveUrl { url }])
        }
        "-send" => {
            if args.len() < 4 {
                return usage_msgs(msg_key("cmd.tabs.error.sendUsage"));
            }
            let device_id = match sanitize_device_id(&args[2]) {
                Some(id) => id,
                None => {
                    return usage_msgs(msg_key("cmd.tabs.error.invalidDeviceId"));
                }
            };
            let payload = args
                .iter()
                .skip(3)
                .cloned()
                .collect::<Vec<_>>()
                .join(" ")
                .trim()
                .to_string();
            if payload.is_empty() || payload.len() > MAX_SEND_PAYLOAD_LEN {
                return usage_msgs(msg_key("cmd.tabs.error.sendUsage"));
            }
            // EN: Reuse SyncOpen host action (DataChannel open_tabs + optional --close).
            ui(UiAction::SyncOpen {
                device_id,
                payload,
            })
        }
        _ => usage_msgs(msg_key("cmd.tabs.error.internalDispatchOutOfSync")),
    }
}
