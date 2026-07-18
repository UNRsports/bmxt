use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{
    effects, msg_key, msg_param, msgs, msgs_with_prompt, ui, ChromeEffect, DispatchBundle, UiAction,
};
use crate::line_parse::strip_invisible_format_chars;

const USAGE_KEYS: &[&str] = &[
    "cmd.dom.usage.line1",
    "cmd.dom.usage.line2",
    "cmd.dom.usage.line3",
    "cmd.dom.usage.listDetail",
    "cmd.dom.usage.patternDetail",
];

const HOST_PAGE_ACTIVE_TOKEN: &str = "__HOST_DOM_PAGE_ACTIVE__";

#[derive(Debug, Clone, PartialEq, Eq)]
struct DomListOptions {
    picker_mode: String,
    flavor: String,
    show_tag: bool,
    pattern: String,
}

fn normalize_dom_pattern(raw: &str) -> String {
    let t = strip_invisible_format_chars(raw.trim());
    let chars: Vec<char> = t.chars().collect();
    if chars.len() >= 2 {
        let a = chars[0];
        let b = chars[chars.len() - 1];
        if (a == '"' && b == '"') || (a == '\'' && b == '\'') {
            return strip_invisible_format_chars(
                chars[1..chars.len() - 1].iter().collect::<String>().trim(),
            );
        }
    }
    t
}

fn parse_dom_picker_mode(token: &str) -> Option<&'static str> {
    match token {
        "--normal" => Some("normal"),
        "--with" => Some("with"),
        _ => None,
    }
}

fn parse_dom_flavor(token: &str) -> Option<&'static str> {
    match token {
        "--html" => Some("--html"),
        "--react" => Some("--react"),
        _ => None,
    }
}

fn parse_dom_list_line(trimmed: &str) -> Option<DomListOptions> {
    let parts: Vec<String> = trimmed
        .trim()
        .split_whitespace()
        .filter(|p| !p.is_empty())
        .map(|p| p.to_string())
        .collect();
    if parts.len() < 2 {
        return None;
    }
    if normalize_token(&parts[0]) != "dom" || normalize_token(&parts[1]) != "-list" {
        return None;
    }

    let mut picker_mode = "normal".to_string();
    let mut flavor = "--html".to_string();
    let mut show_tag = false;
    let mut pattern_parts: Vec<String> = Vec::new();

    for raw in parts.iter().skip(2) {
        let token = normalize_token(raw);
        if let Some(mode) = parse_dom_picker_mode(&token) {
            picker_mode = mode.to_string();
            continue;
        }
        if let Some(flav) = parse_dom_flavor(&token) {
            flavor = flav.to_string();
            continue;
        }
        if token == "--tag" {
            show_tag = true;
            continue;
        }
        if token.starts_with("--") {
            return None;
        }
        pattern_parts.push(raw.clone());
    }

    if picker_mode != "with" {
        show_tag = false;
    }

    Some(DomListOptions {
        picker_mode,
        flavor,
        show_tag,
        pattern: normalize_dom_pattern(&pattern_parts.join(" ")),
    })
}

fn usage_msgs(extra: crate::ir::Msg) -> DispatchBundle {
    let mut msgs_vec = vec![extra];
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs(msgs_vec)
}

fn run_list(args: &[String]) -> DispatchBundle {
    let line: String = args
        .iter()
        .map(|a| strip_invisible_format_chars(a))
        .collect::<Vec<_>>()
        .join(" ");
    let Some(parsed) = parse_dom_list_line(&line) else {
        return usage_msgs(msg_key("cmd.dom.error.listUsage"));
    };
    effects(vec![ChromeEffect::DomList {
        flavor: parsed.flavor,
        pattern: parsed.pattern,
        picker_mode: parsed.picker_mode,
        show_tag: if parsed.show_tag {
            "true".to_string()
        } else {
            "false".to_string()
        },
    }])
}

fn run_dom_setting(args: &[String]) -> DispatchBundle {
    if args.len() == 2 {
        return msgs_with_prompt(
            vec![
                msg_key("dom.setting.choose"),
                msg_param(
                    "dom.setting.pageActiveCurrent",
                    "token",
                    HOST_PAGE_ACTIVE_TOKEN,
                ),
            ],
            "dom -setting ",
        );
    }
    if args.len() == 3 {
        if normalize_token(&args[2]) != "-page-active" {
            return usage_msgs(msg_param("cmd.dom.error.unknownOption", "option", &args[2]));
        }
        return msgs_with_prompt(
            vec![
                msg_param("dom.pageActive.choose", "options", "--auto | --manual"),
                msg_param(
                    "dom.setting.pageActiveCurrent",
                    "token",
                    HOST_PAGE_ACTIVE_TOKEN,
                ),
            ],
            "dom -setting -page-active ",
        );
    }
    if args.len() == 4 && normalize_token(&args[2]) == "-page-active" {
        let mode = match normalize_token(&args[3]).as_str() {
            "--auto" => Some("auto"),
            "--manual" => Some("manual"),
            _ => None,
        };
        if let Some(mode) = mode {
            return ui(UiAction::DomSetting {
                mode: mode.to_string(),
            });
        }
    }
    usage_msgs(msg_key("cmd.dom.error.listUsage"))
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("dom", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => run_list(args),
        "-exit" => {
            if args.len() != 3 || normalize_token(args.get(2).map(String::as_str).unwrap_or("")) != "-list"
            {
                return usage_msgs(msg_key("cmd.dom.error.exitListUsage"));
            }
            ui(UiAction::DomExitList)
        }
        "-setting" => run_dom_setting(args),
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            usage_msgs(msg_param("cmd.dom.error.internal", "option", option))
        }
    }
}
