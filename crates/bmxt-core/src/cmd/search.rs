use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msgs, ui, ChromeEffect, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.search.usage.line1",
    "cmd.search.usage.line2",
    "cmd.search.usage.line3",
    "cmd.search.usage.pattern",
    "cmd.search.usage.quotes",
];

fn normalize_search_list_dispatch_line(trimmed: &str) -> String {
    let parts: Vec<&str> = trimmed.trim().split_whitespace().collect();
    if parts.len() == 2
        && parts[0].eq_ignore_ascii_case("search")
        && parts[1].eq_ignore_ascii_case("-list")
    {
        return "search -list --all".to_string();
    }
    trimmed.trim().to_string()
}

fn parse_search_list_line(args: &[String]) -> Option<String> {
    if args.len() < 2 {
        return None;
    }
    if normalize_token(&args[0]) != "search" || normalize_token(&args[1]) != "-list" {
        return None;
    }
    let kept: Vec<String> = args.to_vec();
    Some(normalize_search_list_dispatch_line(&kept.join(" ")))
}

fn run_list(args: &[String]) -> DispatchBundle {
    let Some(dispatch_line) = parse_search_list_line(args) else {
        return msgs_from_keys(USAGE_KEYS);
    };
    effects(vec![ChromeEffect::SearchList { dispatch_line }])
}

fn msgs_from_keys(keys: &[&str]) -> DispatchBundle {
    msgs(keys.iter().map(|k| msg_key(k)).collect())
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("search", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => run_list(args),
        "-exit" => {
            if args.len() != 3
                || normalize_token(args.get(2).map(String::as_str).unwrap_or("")) != "-list"
            {
                let mut msgs_vec = vec![msg_key("cmd.search.error.exitListUsage")];
                for key in USAGE_KEYS {
                    msgs_vec.push(msg_key(key));
                }
                return msgs(msgs_vec);
            }
            ui(UiAction::ClosePicker {
                slot: "search".to_string(),
            })
        }
        _ => msgs_from_keys(USAGE_KEYS),
    }
}
