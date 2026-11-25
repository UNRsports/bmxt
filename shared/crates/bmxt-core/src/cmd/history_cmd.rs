use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msgs, ui, HostEffect, DispatchBundle, UiAction};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.history.usage.line1",
    "cmd.history.usage.line2",
    "cmd.history.usage.line3",
    "cmd.history.usage.line4",
];

const MAX_ID_LEN: usize = 64;
const MAX_URL_LEN: usize = 2048;
const MAX_URLS_CSV: usize = 32_000;

fn msgs_from_keys(keys: &[&str]) -> DispatchBundle {
    msgs(keys.iter().map(|k| msg_key(k)).collect())
}

fn usage() -> DispatchBundle {
    msgs_from_keys(USAGE_KEYS)
}

fn sanitize_device_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_ID_LEN {
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

fn sanitize_url(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_URL_LEN {
        return None;
    }
    parse_http_url_candidate(trimmed)
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|a| a == flag)
}

fn parse_iso_to_ms(raw: &str) -> Option<i64> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > 64 {
        return None;
    }
    // Accept epoch millis digits or leave ISO for host parse (pass through as string).
    if trimmed.chars().all(|c| c.is_ascii_digit()) {
        return trimmed.parse::<i64>().ok().filter(|n| *n >= 0);
    }
    // Host will parse ISO-8601; Rust only length/charset-sanitizes.
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || "-:.+TZ ".contains(c))
    {
        return None;
    }
    // Encode as negative sentinel-free marker: host receives the string via effect fields.
    // We store the raw ISO in start_ms/end_ms strings from the caller.
    Some(0)
}

fn run_list(args: &[String]) -> DispatchBundle {
    let mut device_scope = "local".to_string();
    let mut device_id = String::new();
    let mut pattern_parts: Vec<String> = Vec::new();
    let mut i = 2usize;
    while i < args.len() {
        let token = normalize_token(&args[i]);
        if token == "--peers" {
            if device_scope != "local" {
                return usage();
            }
            device_scope = "peers".to_string();
            i += 1;
            continue;
        }
        if token == "--device" {
            if device_scope != "local" {
                return usage();
            }
            // EN: Bare `--device` (no id) is a valid plan; host picks via `| browse` or misuse on plain.
            // JA: ID なし `--device` は合法 plan。plain はホストが misuse、`| browse` で番号選択。
            device_scope = "device".to_string();
            if let Some(id) = args.get(i + 1).and_then(|s| sanitize_device_id(s)) {
                device_id = id;
                i += 2;
            } else {
                device_id = String::new();
                i += 1;
            }
            continue;
        }
        if args[i].starts_with('-') {
            return usage();
        }
        pattern_parts.push(args[i].clone());
        i += 1;
    }

    // EN: Cross-device history stays on search (flat). Local uses date-tree list.
    // JA: ピア横断は search のフラット一覧。ローカルは日付ツリー list。
    if device_scope == "peers" || device_scope == "device" {
        let mut peer_parts = vec![
            "search".to_string(),
            "-list".to_string(),
            "--history".to_string(),
        ];
        peer_parts.extend(pattern_parts.iter().cloned());
        let mut dispatch_parts = vec![
            "search".to_string(),
            "-list".to_string(),
            "--history".to_string(),
        ];
        if device_scope == "peers" {
            dispatch_parts.push("--peers".to_string());
        } else {
            dispatch_parts.push("--device".to_string());
            if !device_id.is_empty() {
                dispatch_parts.push(device_id.clone());
            }
        }
        dispatch_parts.extend(pattern_parts);
        return effects(vec![HostEffect::SearchList {
            dispatch_line: dispatch_parts.join(" "),
            peer_dispatch_line: peer_parts.join(" "),
            device_scope,
            device_id,
        }]);
    }

    ui(UiAction::OpenPlainList {
        list_id: "history".to_string(),
        line: args.join(" "),
        show_url: "false".to_string(),
        device_scope,
        device_id,
    })
}

fn run_delete(args: &[String]) -> DispatchBundle {
    if args.len() <= 2 {
        return usage();
    }
    let mut urls: Vec<String> = Vec::new();
    for token in args.iter().skip(2) {
        if token.starts_with('-') {
            return usage();
        }
        let Some(url) = sanitize_url(token) else {
            return usage();
        };
        urls.push(url);
    }
    let csv = urls.join("\n");
    if csv.len() > MAX_URLS_CSV {
        return usage();
    }
    effects(vec![HostEffect::HistoryDeleteUrl { urls: csv }])
}

fn run_delete_range(args: &[String]) -> DispatchBundle {
    let mut from_raw: Option<String> = None;
    let mut to_raw: Option<String> = None;
    let mut i = 2usize;
    while i < args.len() {
        if args[i] == "--from" {
            let Some(raw) = args.get(i + 1) else {
                return usage();
            };
            if parse_iso_to_ms(raw).is_none() {
                return usage();
            }
            from_raw = Some(raw.trim().to_string());
            i += 2;
            continue;
        }
        if args[i] == "--to" {
            let Some(raw) = args.get(i + 1) else {
                return usage();
            };
            if parse_iso_to_ms(raw).is_none() {
                return usage();
            }
            to_raw = Some(raw.trim().to_string());
            i += 2;
            continue;
        }
        return usage();
    }
    let (Some(start_ms), Some(end_ms)) = (from_raw, to_raw) else {
        return usage();
    };
    effects(vec![HostEffect::HistoryDeleteRange { start_ms, end_ms }])
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("history", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => run_list(args),
        "-delete" => run_delete(args),
        "-delete-range" => run_delete_range(args),
        "-backup" => {
            if args.len() != 2 {
                return usage();
            }
            ui(UiAction::HistoryBackup)
        }
        "-restore" => {
            let as_bookmarks = if has_flag(&args[2..], "--as-bookmarks") {
                "1".to_string()
            } else {
                "0".to_string()
            };
            if args.len() > 3 || (args.len() == 3 && !has_flag(&args[2..], "--as-bookmarks")) {
                return usage();
            }
            ui(UiAction::HistoryRestore { as_bookmarks })
        }
        "help" => usage(),
        _ => helpers::unknown_option("history", &first_lc, USAGE_KEYS),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_local_emits_open_plain_list() {
        let bundle = run(&["history".into(), "-list".into(), "foo".into()]);
        match bundle {
            DispatchBundle::Ui {
                action:
                    UiAction::OpenPlainList {
                        list_id,
                        line,
                        ..
                    },
                ..
            } => {
                assert_eq!(list_id, "history");
                assert!(line.contains("history -list"));
                assert!(line.contains("foo"));
            }
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn list_peers_emits_search_history() {
        let bundle = run(&[
            "history".into(),
            "-list".into(),
            "--peers".into(),
            "foo".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::SearchList {
                    peer_dispatch_line, ..
                } => {
                    assert!(peer_dispatch_line.contains("--history"));
                    assert!(peer_dispatch_line.contains("foo"));
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn list_bare_device_emits_search_list_with_empty_id() {
        let bundle = run(&["history".into(), "-list".into(), "--device".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::SearchList {
                    dispatch_line,
                    device_scope,
                    device_id,
                    ..
                } => {
                    assert_eq!(device_scope, "device");
                    assert!(device_id.is_empty());
                    assert!(dispatch_line.ends_with("--device") || dispatch_line.contains("--device "));
                    assert!(!dispatch_line.contains("--device  "));
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }
}
