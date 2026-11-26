use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msgs, ui, HostEffect, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.search.usage.line1",
    "cmd.search.usage.line2",
    "cmd.search.usage.line3",
    "cmd.search.usage.pattern",
    "cmd.search.usage.quotes",
];

struct SearchListPlan {
    dispatch_line: String,
    peer_dispatch_line: String,
    device_scope: String,
    device_id: String,
}

fn normalize_search_list_peer_line(parts: &[String]) -> String {
    if parts.len() == 2
        && normalize_token(&parts[0]) == "search"
        && normalize_token(&parts[1]) == "-list"
    {
        return "search -list --all".to_string();
    }
    parts.join(" ")
}

/// EN: Parse `search -list` + `--device`/`--peers` into a structured plan (Rust SoT).
fn parse_search_list_plan(args: &[String]) -> Option<SearchListPlan> {
    if args.len() < 2 {
        return None;
    }
    if normalize_token(&args[0]) != "search" || normalize_token(&args[1]) != "-list" {
        return None;
    }

    let mut device_scope = "local".to_string();
    let mut device_id = String::new();
    let mut rest: Vec<String> = Vec::new();
    let mut i = 2usize;
    while i < args.len() {
        let token = normalize_token(&args[i]);
        if token == "--peers" {
            if device_scope != "local" {
                return None;
            }
            device_scope = "peers".to_string();
            i += 1;
            continue;
        }
        if token == "--device" {
            if device_scope != "local" {
                return None;
            }
            // EN: Bare `--device` (no id) is a valid plan; host picks via `| browse` or misuse on plain.
            // JA: ID なし `--device` は合法 plan。plain はホストが misuse、`| browse` で番号選択。
            device_scope = "device".to_string();
            let next = args.get(i + 1).map(|s| s.trim()).unwrap_or("");
            if !next.is_empty() && !next.starts_with('-') {
                device_id = next.to_string();
                i += 2;
            } else {
                device_id = String::new();
                i += 1;
            }
            continue;
        }
        rest.push(args[i].clone());
        i += 1;
    }

    let mut peer_parts = vec!["search".to_string(), "-list".to_string()];
    peer_parts.extend(rest.iter().cloned());
    let peer_dispatch_line = normalize_search_list_peer_line(&peer_parts);

    let mut dispatch_parts = vec!["search".to_string(), "-list".to_string()];
    if device_scope == "peers" {
        dispatch_parts.push("--peers".to_string());
    } else if device_scope == "device" {
        dispatch_parts.push("--device".to_string());
        if !device_id.is_empty() {
            dispatch_parts.push(device_id.clone());
        }
    }
    dispatch_parts.extend(rest);
    let dispatch_line = normalize_search_list_peer_line(&dispatch_parts);

    Some(SearchListPlan {
        dispatch_line,
        peer_dispatch_line,
        device_scope,
        device_id,
    })
}

fn run_list(args: &[String]) -> DispatchBundle {
    let Some(plan) = parse_search_list_plan(args) else {
        return msgs_from_keys(USAGE_KEYS);
    };
    effects(vec![HostEffect::SearchList {
        dispatch_line: plan.dispatch_line,
        peer_dispatch_line: plan.peer_dispatch_line,
        device_scope: plan.device_scope,
        device_id: plan.device_id,
    }])
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn list_bare_device_emits_search_list_with_empty_id() {
        match run(&["search".into(), "-list".into(), "--device".into()]) {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::SearchList {
                    dispatch_line,
                    device_scope,
                    device_id,
                    ..
                } => {
                    assert_eq!(device_scope, "device");
                    assert!(device_id.is_empty());
                    assert!(dispatch_line.ends_with("--device"));
                }
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("expected effects, got {other:?}"),
        }
    }

    #[test]
    fn list_emits_structured_local_plan() {
        match run(&["search".into(), "-list".into(), "foo".into()]) {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::SearchList {
                    dispatch_line,
                    peer_dispatch_line,
                    device_scope,
                    device_id,
                } => {
                    assert_eq!(device_scope, "local");
                    assert!(device_id.is_empty());
                    assert!(dispatch_line.contains("foo"));
                    assert!(peer_dispatch_line.contains("foo"));
                }
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("expected effects, got {other:?}"),
        }
    }
}
