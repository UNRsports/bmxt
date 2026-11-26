use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msgs, ui, HostEffect, DispatchBundle, UiAction};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.bookmark.usage.line1",
    "cmd.bookmark.usage.line2",
    "cmd.bookmark.usage.line3",
    "cmd.bookmark.usage.line4",
    "cmd.bookmark.usage.line5",
    "cmd.bookmark.usage.line6",
];

const MAX_ID_LEN: usize = 64;
const MAX_TITLE_LEN: usize = 512;
const MAX_URL_LEN: usize = 2048;
const MAX_PAYLOAD_LEN: usize = 48_000;

fn msgs_from_keys(keys: &[&str]) -> DispatchBundle {
    msgs(keys.iter().map(|k| msg_key(k)).collect())
}

fn usage() -> DispatchBundle {
    msgs_from_keys(USAGE_KEYS)
}

fn sanitize_id(raw: &str) -> Option<String> {
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

fn sanitize_title(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_TITLE_LEN {
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

fn join_csv(ids: &[String]) -> String {
    ids.join(",")
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|a| a == flag)
}

fn parse_device_scope(args: &[String], start: usize) -> Option<(String, String, Vec<String>)> {
    let mut device_scope = "local".to_string();
    let mut device_id = String::new();
    let mut rest: Vec<String> = Vec::new();
    let mut i = start;
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
            if let Some(id) = args.get(i + 1).and_then(|s| sanitize_id(s)) {
                device_id = id;
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
    Some((device_scope, device_id, rest))
}

fn run_list(args: &[String]) -> DispatchBundle {
    let Some((device_scope, device_id, rest)) = parse_device_scope(args, 2) else {
        return usage();
    };

    let mut i = 0usize;
    while i < rest.len() {
        if normalize_token(&rest[i]) == "--folder" {
            // EN: Validate folder id; host listPlan re-parses the full line for match.
            // JA: folder id を検証。match は host が行全体を再パースする。
            if rest.get(i + 1).and_then(|s| sanitize_id(s)).is_none() {
                return usage();
            }
            i += 2;
            continue;
        }
        return usage();
    }

    // EN: Cross-device bookmark list stays on search (flat). Local uses folder tree list.
    // JA: ピア横断は search のフラット一覧。ローカルはフォルダツリー list。
    if device_scope == "peers" || device_scope == "device" {
        let peer_parts = vec![
            "search".to_string(),
            "-list".to_string(),
            "--bookmark".to_string(),
        ];
        let mut dispatch_parts = peer_parts.clone();
        if device_scope == "peers" {
            dispatch_parts.push("--peers".to_string());
        } else {
            dispatch_parts.push("--device".to_string());
            if !device_id.is_empty() {
                dispatch_parts.push(device_id.clone());
            }
        }
        return effects(vec![HostEffect::SearchList {
            dispatch_line: dispatch_parts.join(" "),
            peer_dispatch_line: peer_parts.join(" "),
            device_scope,
            device_id,
        }]);
    }

    ui(UiAction::OpenPlainList {
        list_id: "bookmark".to_string(),
        line: args.join(" "),
        show_url: "false".to_string(),
        device_scope,
        device_id,
    })
}

fn run_add(args: &[String]) -> DispatchBundle {
    let mut url: Option<String> = None;
    let mut title = String::new();
    let mut parent_id = String::new();
    // EN: "" = refuse duplicates (suggest flags); "force" | "skip"
    let mut dup_mode = String::new();
    let mut i = 2usize;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--title" {
            let Some(raw) = args.get(i + 1).and_then(|s| sanitize_title(s)) else {
                return usage();
            };
            title = raw;
            i += 2;
            continue;
        }
        if token == "--parent" {
            let Some(id) = args.get(i + 1).and_then(|s| sanitize_id(s)) else {
                return usage();
            };
            parent_id = id;
            i += 2;
            continue;
        }
        if token == "--force" {
            if !dup_mode.is_empty() {
                return usage();
            }
            dup_mode = "force".to_string();
            i += 1;
            continue;
        }
        if token == "--skip-dup" {
            if !dup_mode.is_empty() {
                return usage();
            }
            dup_mode = "skip".to_string();
            i += 1;
            continue;
        }
        if token.starts_with('-') {
            return usage();
        }
        if url.is_some() {
            return usage();
        }
        let Some(parsed) = sanitize_url(token) else {
            return usage();
        };
        url = Some(parsed);
        i += 1;
    }
    let Some(url) = url else {
        return usage();
    };
    effects(vec![HostEffect::BookmarkCreate {
        url,
        title,
        parent_id,
        dup_mode,
    }])
}

fn run_folder(args: &[String]) -> DispatchBundle {
    let mut title: Option<String> = None;
    let mut parent_id = String::new();
    let mut i = 2usize;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--parent" {
            let Some(id) = args.get(i + 1).and_then(|s| sanitize_id(s)) else {
                return usage();
            };
            parent_id = id;
            i += 2;
            continue;
        }
        if token.starts_with('-') {
            return usage();
        }
        if title.is_some() {
            return usage();
        }
        let Some(t) = sanitize_title(token) else {
            return usage();
        };
        title = Some(t);
        i += 1;
    }
    let Some(title) = title else {
        return usage();
    };
    effects(vec![HostEffect::BookmarkCreateFolder { title, parent_id }])
}

fn collect_ids(args: &[String], start: usize, stop_flags: &[&str]) -> Option<(Vec<String>, usize)> {
    let mut ids = Vec::new();
    let mut i = start;
    while i < args.len() {
        let token = args[i].as_str();
        if stop_flags.iter().any(|f| *f == token) {
            break;
        }
        if token.starts_with('-') {
            return None;
        }
        let Some(id) = sanitize_id(token) else {
            return None;
        };
        ids.push(id);
        i += 1;
    }
    if ids.is_empty() {
        return None;
    }
    Some((ids, i))
}

fn run_remove(args: &[String]) -> DispatchBundle {
    if args.len() <= 2 {
        return usage();
    }
    let Some((ids, end)) = collect_ids(args, 2, &[]) else {
        return usage();
    };
    if end != args.len() {
        return usage();
    }
    effects(vec![HostEffect::BookmarkRemove {
        ids: join_csv(&ids),
    }])
}

fn run_move(args: &[String]) -> DispatchBundle {
    if args.len() <= 2 {
        return usage();
    }
    let Some((ids, mut i)) = collect_ids(args, 2, &["--parent", "--index"]) else {
        return usage();
    };
    let mut parent_id = String::new();
    let mut index = String::new();
    while i < args.len() {
        if args[i] == "--parent" {
            let Some(id) = args.get(i + 1).and_then(|s| sanitize_id(s)) else {
                return usage();
            };
            parent_id = id;
            i += 2;
            continue;
        }
        if args[i] == "--index" {
            let Some(raw) = args.get(i + 1) else {
                return usage();
            };
            let Ok(n) = raw.parse::<i64>() else {
                return usage();
            };
            if n < 0 {
                return usage();
            }
            index = n.to_string();
            i += 2;
            continue;
        }
        return usage();
    }
    if parent_id.is_empty() {
        return usage();
    }
    effects(vec![HostEffect::BookmarkMove {
        ids: join_csv(&ids),
        parent_id,
        index,
    }])
}

fn run_send(args: &[String]) -> DispatchBundle {
    if args.len() < 3 {
        return usage();
    }
    let Some(device_id) = sanitize_id(&args[2]) else {
        return usage();
    };
    let mut mode = "open".to_string();
    let mut parent_id = String::new();
    let mut group_title = String::new();
    let mut urls: Vec<String> = Vec::new();
    let mut i = 3usize;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--open" {
            mode = "open".to_string();
            i += 1;
            continue;
        }
        if token == "--save" {
            mode = "save".to_string();
            i += 1;
            continue;
        }
        if token == "--both" {
            mode = "both".to_string();
            i += 1;
            continue;
        }
        if token == "--parent" {
            let Some(id) = args.get(i + 1).and_then(|s| sanitize_id(s)) else {
                return usage();
            };
            parent_id = id;
            i += 2;
            continue;
        }
        if token == "--group" {
            let Some(title) = args.get(i + 1).and_then(|s| sanitize_title(s)) else {
                return usage();
            };
            group_title = title;
            i += 2;
            continue;
        }
        if token.starts_with('-') {
            return usage();
        }
        let Some(url) = sanitize_url(token) else {
            return usage();
        };
        urls.push(url);
        i += 1;
    }
    if mode != "open" && mode != "save" && mode != "both" {
        return usage();
    }
    let mut payload_parts: Vec<String> = Vec::new();
    if !parent_id.is_empty() {
        payload_parts.push("--parent".to_string());
        payload_parts.push(parent_id);
    }
    if !group_title.is_empty() {
        payload_parts.push("--group".to_string());
        payload_parts.push(group_title);
    }
    payload_parts.extend(urls);
    let payload = payload_parts.join(" ");
    if payload.len() > MAX_PAYLOAD_LEN {
        return usage();
    }
    ui(UiAction::SyncBookmarkSend {
        device_id,
        mode,
        payload,
    })
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("bookmark", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-list" => run_list(args),
        "-add" => run_add(args),
        "-folder" => run_folder(args),
        "-remove" => run_remove(args),
        "-move" => run_move(args),
        "-send" => run_send(args),
        "-backup" => {
            if args.len() != 2 {
                return usage();
            }
            ui(UiAction::BookmarkBackup)
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
            ui(UiAction::BookmarkRestore { as_bookmarks })
        }
        "help" => usage(),
        _ => helpers::unknown_option("bookmark", &first_lc, USAGE_KEYS),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_local_emits_open_plain_list() {
        let bundle = run(&["bookmark".into(), "-list".into()]);
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
                assert_eq!(list_id, "bookmark");
                assert!(line.contains("bookmark -list"));
            }
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn list_peers_emits_search_list() {
        let bundle = run(&["bookmark".into(), "-list".into(), "--peers".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::SearchList {
                    peer_dispatch_line, ..
                } => assert!(peer_dispatch_line.contains("--bookmark")),
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn list_bare_device_emits_search_list_with_empty_id() {
        let bundle = run(&["bookmark".into(), "-list".into(), "--device".into()]);
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
                    assert!(dispatch_line.ends_with("--device"));
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn add_emits_create() {
        let bundle = run(&[
            "bookmark".into(),
            "-add".into(),
            "https://example.com".into(),
            "--title".into(),
            "Ex".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::BookmarkCreate { url, title, .. } => {
                    assert_eq!(url, "https://example.com");
                    assert_eq!(title, "Ex");
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn send_default_open() {
        let bundle = run(&[
            "bookmark".into(),
            "-send".into(),
            "peer1".into(),
            "https://example.com".into(),
        ]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::SyncBookmarkSend { mode, .. },
                ..
            } => assert_eq!(mode, "open"),
            other => panic!("unexpected: {other:?}"),
        }
    }

}
