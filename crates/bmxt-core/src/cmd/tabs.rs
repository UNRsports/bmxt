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
    "cmd.tabs.usage.line6",
    "cmd.tabs.usage.line7",
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
        "-back" => Some("-back"),
        "-forward" => Some("-forward"),
        "-reload" => Some("-reload"),
        "-close" => Some("-close"),
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

fn parse_reload_tab_ids(args: &[String]) -> Result<Vec<i64>, DispatchBundle> {
    let mut ids = Vec::new();
    for raw in args.iter().skip(2) {
        let tok = raw.trim();
        if tok.is_empty() {
            continue;
        }
        let Some(id_str) = tok.strip_prefix("#t:") else {
            return Err(msgs(vec![
                msg_param("cmd.tabs.error.badReloadToken", "token", tok),
                msg_key("cmd.tabs.usage.line6"),
            ]));
        };
        match id_str.parse::<i64>() {
            Ok(id) if id >= 0 => {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            _ => {
                return Err(msgs(vec![
                    msg_param("cmd.tabs.error.badReloadToken", "token", tok),
                    msg_key("cmd.tabs.usage.line6"),
                ]));
            }
        }
    }
    Ok(ids)
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
            return ui(UiAction::TabsSetting {
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
            ui(UiAction::TabsExitList)
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
        "-back" => effects(vec![ChromeEffect::TabGoBack]),
        "-forward" => effects(vec![ChromeEffect::TabGoForward]),
        "-reload" => match parse_reload_tab_ids(args) {
            Ok(tab_ids) => effects(vec![ChromeEffect::TabReload { tab_ids }]),
            Err(bundle) => bundle,
        },
        "-close" => {
            if args.iter().any(|a| a == "--confirmed") {
                effects(vec![ChromeEffect::CloseCurrentTab])
            } else {
                ui(UiAction::NavConfirmClose {
                    target: "tab".to_string(),
                })
            }
        }
        _ => usage_msgs(msg_key("cmd.tabs.error.internalDispatchOutOfSync")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn reload_empty_emits_empty_tab_ids() {
        let bundle = run(&["tab".into(), "-reload".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => {
                assert_eq!(effects.len(), 1);
                match &effects[0] {
                    ChromeEffect::TabReload { tab_ids } => assert!(tab_ids.is_empty()),
                    other => panic!("unexpected effect: {other:?}"),
                }
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn reload_parses_tab_tokens() {
        let bundle = run(&[
            "tab".into(),
            "-reload".into(),
            "#t:12".into(),
            "#t:34".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabReload { tab_ids } => assert_eq!(tab_ids, &vec![12, 34]),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn close_emits_confirm_ui() {
        let bundle = run(&["tab".into(), "-close".into()]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::NavConfirmClose { target },
            } => assert_eq!(target, "tab"),
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
