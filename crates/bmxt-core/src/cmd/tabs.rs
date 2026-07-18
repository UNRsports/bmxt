use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msgs, ui, ChromeEffect, DispatchBundle, UiAction};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.tabs.usage.line1",
    "cmd.tabs.usage.line2",
    "cmd.tabs.usage.line3",
    "cmd.tabs.usage.line4",
    "cmd.tabs.usage.line5",
];

fn norm_tabs_flag(arg: &str) -> Option<char> {
    match normalize_token(arg).as_str() {
        "-list" => Some('l'),
        "-exit" => Some('e'),
        "-setting" => Some('s'),
        "-moveurl" => Some('m'),
        "-nowurl" => Some('n'),
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

pub fn run(args: &[String]) -> DispatchBundle {
    if let Err(bundle) = helpers::require_second_token("tabs", args, USAGE_KEYS) {
        return bundle;
    }

    let sub = norm_tabs_flag(args.get(1).map(String::as_str).unwrap_or(""));
    let Some(sub) = sub else {
        let mut msgs_vec = vec![msg_key("cmd.tabs.error.internalOutOfSync")];
        for key in USAGE_KEYS {
            msgs_vec.push(msg_key(key));
        }
        return msgs(msgs_vec);
    };

    match sub {
        'l' => match parse_tabs_list_args(args) {
            Ok(show_url) => effects(vec![ChromeEffect::TabsList {
                show_url: if show_url {
                    "true".to_string()
                } else {
                    "false".to_string()
                },
            }]),
            Err(()) => {
                let mut msgs_vec = vec![msg_key("cmd.tabs.error.invalidListUsage")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                msgs(msgs_vec)
            }
        },
        'e' => {
            if args.len() != 3 || normalize_token(&args[2]) != "-list" {
                let mut msgs_vec = vec![msg_key("cmd.tabs.error.exitListUsage")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                return msgs(msgs_vec);
            }
            ui(UiAction::TabsExitList)
        }
        's' => ui(UiAction::TabsSetting),
        'n' => {
            if args.len() > 2 {
                let mut msgs_vec = vec![msg_key("cmd.tabs.error.tooManyArgs")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                return msgs(msgs_vec);
            }
            effects(vec![ChromeEffect::TabsNu])
        }
        'm' => {
            let url_part = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ").trim().to_string();
            if url_part.is_empty() {
                let mut msgs_vec = vec![msg_key("cmd.tabs.error.usageMoveurl")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                return msgs(msgs_vec);
            }
            let Some(url) = parse_http_url_candidate(&url_part) else {
                let mut msgs_vec = vec![msg_key("cmd.tabs.error.usageMoveurl")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                return msgs(msgs_vec);
            };
            effects(vec![ChromeEffect::TabsMoveUrl { url }])
        }
        _ => {
            let mut msgs_vec = vec![msg_key("cmd.tabs.error.internalDispatchOutOfSync")];
            for key in USAGE_KEYS {
                msgs_vec.push(msg_key(key));
            }
            msgs(msgs_vec)
        }
    }
}
