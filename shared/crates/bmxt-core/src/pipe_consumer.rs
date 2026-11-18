//! Pipe RHS consumer classification (host-blind SoT).
//! EN: Token grammar for `|` right-hand stages lives here; TS only paints / applies effects.

use crate::generated::resolve_canonical;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OpenPipeMode {
    NewTab,
    NewWindow,
    IntoWindow,
    IntoGroup,
}

/// EN: Structured pipe-consumer match (id + flags). `null` JSON when not a consumer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "id")]
pub enum PipeConsumerClass {
    #[serde(rename = "browse")]
    Browse,
    #[serde(rename = "close")]
    Close,
    #[serde(rename = "back")]
    Back,
    #[serde(rename = "forward")]
    Forward,
    #[serde(rename = "reload")]
    Reload,
    #[serde(rename = "jump")]
    Jump,
    #[serde(rename = "new-window")]
    NewWindow,
    #[serde(rename = "tab-send")]
    TabSend {
        #[serde(rename = "deviceId")]
        device_id: String,
        #[serde(rename = "closeAfter")]
        close_after: bool,
    },
    #[serde(rename = "open")]
    Open {
        mode: OpenPipeMode,
        #[serde(rename = "windowId", skip_serializing_if = "Option::is_none")]
        window_id: Option<i32>,
        #[serde(rename = "groupId", skip_serializing_if = "Option::is_none")]
        group_id: Option<i32>,
    },
    #[serde(rename = "move")]
    Move {
        #[serde(rename = "windowId")]
        window_id: i32,
        #[serde(rename = "groupId")]
        group_id: i32,
        ungroup: bool,
    },
    #[serde(rename = "bookmark-remove")]
    BookmarkRemove,
    #[serde(rename = "bookmark-move")]
    BookmarkMove {
        #[serde(rename = "parentId")]
        parent_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        index: Option<i32>,
    },
    #[serde(rename = "bookmark-send")]
    BookmarkSend {
        #[serde(rename = "deviceId")]
        device_id: String,
        /// "open" | "save" | "both"
        mode: String,
        #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
        parent_id: Option<String>,
        #[serde(rename = "groupTitle", skip_serializing_if = "Option::is_none")]
        group_title: Option<String>,
    },
    #[serde(rename = "history-delete")]
    HistoryDelete,
}

fn split_tokens(segment: &str) -> Vec<String> {
    segment
        .trim()
        .split_whitespace()
        .filter(|p| !p.is_empty())
        .map(|p| p.to_string())
        .collect()
}

fn normalize_token(token: &str) -> String {
    token.trim().to_ascii_lowercase()
}

fn resolves_to_canonical(token: &str, expected: &str) -> bool {
    match resolve_canonical(&normalize_token(token)) {
        Some(name) => name == expected,
        None => false,
    }
}

fn classify_bare_canonical(parts: &[String], expected: &str, class: PipeConsumerClass) -> Option<PipeConsumerClass> {
    if parts.len() != 1 {
        return None;
    }
    if resolves_to_canonical(&parts[0], expected) {
        Some(class)
    } else {
        None
    }
}

fn parse_tab_send(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.len() != 3 && parts.len() != 4 {
        return None;
    }
    if normalize_token(&parts[0]) != "tab" {
        return None;
    }
    if normalize_token(&parts[1]) != "-send" {
        return None;
    }
    let device_id = parts[2].trim().to_string();
    if device_id.is_empty() || device_id.starts_with('-') {
        return None;
    }
    let mut close_after = false;
    if parts.len() == 4 {
        if parts[3] != "--close" {
            return None;
        }
        close_after = true;
    }
    Some(PipeConsumerClass::TabSend {
        device_id,
        close_after,
    })
}

fn parse_open(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.is_empty() || normalize_token(&parts[0]) != "open" {
        return None;
    }
    let mut mode = OpenPipeMode::NewTab;
    let mut window_id: Option<i32> = None;
    let mut group_id: Option<i32> = None;
    let mut i = 1usize;
    while i < parts.len() {
        let token = parts[i].as_str();
        if token == "--window" {
            mode = OpenPipeMode::NewWindow;
            window_id = None;
            group_id = None;
            i += 1;
            continue;
        }
        if token == "--into-window" {
            let id = parts.get(i + 1)?.parse::<i32>().ok()?;
            if id < 0 {
                return None;
            }
            mode = OpenPipeMode::IntoWindow;
            window_id = Some(id);
            group_id = None;
            i += 2;
            continue;
        }
        if token == "--into-group" {
            let gid = parts.get(i + 1)?.parse::<i32>().ok()?;
            if gid < 0 {
                return None;
            }
            i += 2;
            let mut wid = -1_i32;
            if parts.get(i).map(|s| s.as_str()) == Some("--window-id") {
                wid = parts.get(i + 1)?.parse::<i32>().ok()?;
                i += 2;
            }
            if wid < 0 {
                return None;
            }
            mode = OpenPipeMode::IntoGroup;
            window_id = Some(wid);
            group_id = Some(gid);
            continue;
        }
        if token == "--window-id" {
            let wid = parts.get(i + 1)?.parse::<i32>().ok()?;
            i += 2;
            if mode == OpenPipeMode::IntoGroup {
                if wid < 0 {
                    return None;
                }
                window_id = Some(wid);
            }
            continue;
        }
        return None;
    }
    Some(PipeConsumerClass::Open {
        mode,
        window_id,
        group_id,
    })
}

fn parse_move(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.is_empty() || normalize_token(&parts[0]) != "move" {
        return None;
    }
    let mut window_id = -1_i32;
    let mut group_id = -1_i32;
    let mut ungroup = false;
    let mut i = 1usize;
    while i < parts.len() {
        let token = parts[i].as_str();
        if token == "--window" {
            window_id = parts.get(i + 1)?.parse::<i32>().ok()?;
            i += 2;
            continue;
        }
        if token == "--group" {
            group_id = parts.get(i + 1)?.parse::<i32>().ok()?;
            i += 2;
            continue;
        }
        if token == "--ungroup" {
            ungroup = true;
            i += 1;
            continue;
        }
        return None;
    }
    if window_id < 0 {
        return None;
    }
    if ungroup && group_id >= 0 {
        return None;
    }
    Some(PipeConsumerClass::Move {
        window_id,
        group_id,
        ungroup,
    })
}

fn parse_bookmark_remove(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.len() != 2 {
        return None;
    }
    if normalize_token(&parts[0]) != "bookmark" || parts[1] != "-remove" {
        return None;
    }
    Some(PipeConsumerClass::BookmarkRemove)
}

fn parse_bookmark_move(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.len() < 4 || normalize_token(&parts[0]) != "bookmark" || parts[1] != "-move" {
        return None;
    }
    let mut parent_id: Option<String> = None;
    let mut index: Option<i32> = None;
    let mut i = 2usize;
    while i < parts.len() {
        if parts[i] == "--parent" {
            parent_id = Some(parts.get(i + 1)?.to_string());
            i += 2;
        } else if parts[i] == "--index" {
            let n = parts.get(i + 1)?.parse::<i32>().ok()?;
            if n < 0 { return None; }
            index = Some(n);
            i += 2;
        } else {
            return None;
        }
    }
    Some(PipeConsumerClass::BookmarkMove {
        parent_id: parent_id?,
        index,
    })
}

fn parse_bookmark_send(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.len() < 3 || normalize_token(&parts[0]) != "bookmark" || parts[1] != "-send" {
        return None;
    }
    let device_id = parts[2].trim().to_string();
    if device_id.is_empty() || device_id.starts_with('-') {
        return None;
    }
    let mut mode = "open".to_string();
    let mut parent_id: Option<String> = None;
    let mut group_title: Option<String> = None;
    let mut i = 3usize;
    while i < parts.len() {
        match parts[i].as_str() {
            "--open" => { mode = "open".to_string(); i += 1; }
            "--save" => { mode = "save".to_string(); i += 1; }
            "--both" => { mode = "both".to_string(); i += 1; }
            "--parent" => {
                parent_id = Some(parts.get(i + 1)?.to_string());
                i += 2;
            }
            "--group" => {
                let title = parts.get(i + 1..)?.join(" ");
                group_title = if title.is_empty() { None } else { Some(title) };
                break;
            }
            _ => return None,
        }
    }
    Some(PipeConsumerClass::BookmarkSend { device_id, mode, parent_id, group_title })
}

fn parse_history_delete(parts: &[String]) -> Option<PipeConsumerClass> {
    if parts.len() != 2 {
        return None;
    }
    if normalize_token(&parts[0]) != "history" || parts[1] != "-delete" {
        return None;
    }
    Some(PipeConsumerClass::HistoryDelete)
}

/** EN: Classify a pipe RHS segment into a consumer id (+ flags), or `None`. */
pub fn classify_pipe_consumer(segment: &str) -> Option<PipeConsumerClass> {
    let parts = split_tokens(segment);
    if parts.is_empty() {
        return None;
    }

    if let Some(c) = classify_bare_canonical(&parts, "browse", PipeConsumerClass::Browse) {
        return Some(c);
    }
    if let Some(c) = parse_open(&parts) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "jump", PipeConsumerClass::Jump) {
        return Some(c);
    }
    if let Some(c) = parse_move(&parts) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "new-window", PipeConsumerClass::NewWindow) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "back", PipeConsumerClass::Back) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "forward", PipeConsumerClass::Forward) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "reload", PipeConsumerClass::Reload) {
        return Some(c);
    }
    if let Some(c) = classify_bare_canonical(&parts, "close", PipeConsumerClass::Close) {
        return Some(c);
    }
    if let Some(c) = parse_tab_send(&parts) {
        return Some(c);
    }
    if let Some(c) = parse_bookmark_remove(&parts) {
        return Some(c);
    }
    if let Some(c) = parse_bookmark_move(&parts) {
        return Some(c);
    }
    if let Some(c) = parse_bookmark_send(&parts) {
        return Some(c);
    }
    if let Some(c) = parse_history_delete(&parts) {
        return Some(c);
    }
    None
}

pub fn classify_pipe_consumer_json(segment: &str) -> String {
    match classify_pipe_consumer(segment) {
        Some(c) => serde_json::to_string(&c).unwrap_or_else(|_| "null".to_string()),
        None => "null".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_browse_and_close_alias() {
        assert_eq!(
            classify_pipe_consumer("browse"),
            Some(PipeConsumerClass::Browse)
        );
        assert_eq!(
            classify_pipe_consumer("  BROWSE  "),
            Some(PipeConsumerClass::Browse)
        );
        assert_eq!(
            classify_pipe_consumer("close"),
            Some(PipeConsumerClass::Close)
        );
        assert_eq!(
            classify_pipe_consumer("c"),
            Some(PipeConsumerClass::Close)
        );
        assert_eq!(classify_pipe_consumer("browse tab -list"), None);
    }

    #[test]
    fn tab_send_pipe_form() {
        assert_eq!(
            classify_pipe_consumer("tab -send peer1"),
            Some(PipeConsumerClass::TabSend {
                device_id: "peer1".to_string(),
                close_after: false,
            })
        );
        assert_eq!(
            classify_pipe_consumer("tab -send peer1 --close"),
            Some(PipeConsumerClass::TabSend {
                device_id: "peer1".to_string(),
                close_after: true,
            })
        );
        assert_eq!(
            classify_pipe_consumer("tab -send peer1 https://example.com"),
            None
        );
    }

    #[test]
    fn open_and_move_flags() {
        assert_eq!(
            classify_pipe_consumer("open"),
            Some(PipeConsumerClass::Open {
                mode: OpenPipeMode::NewTab,
                window_id: None,
                group_id: None,
            })
        );
        assert_eq!(
            classify_pipe_consumer("open --window"),
            Some(PipeConsumerClass::Open {
                mode: OpenPipeMode::NewWindow,
                window_id: None,
                group_id: None,
            })
        );
        assert_eq!(
            classify_pipe_consumer("open --into-window 3"),
            Some(PipeConsumerClass::Open {
                mode: OpenPipeMode::IntoWindow,
                window_id: Some(3),
                group_id: None,
            })
        );
        assert_eq!(
            classify_pipe_consumer("open --into-group 5 --window-id 2"),
            Some(PipeConsumerClass::Open {
                mode: OpenPipeMode::IntoGroup,
                window_id: Some(2),
                group_id: Some(5),
            })
        );
        assert_eq!(classify_pipe_consumer("open https://x"), None);

        assert_eq!(
            classify_pipe_consumer("move --window 1"),
            Some(PipeConsumerClass::Move {
                window_id: 1,
                group_id: -1,
                ungroup: false,
            })
        );
        assert_eq!(
            classify_pipe_consumer("move --ungroup --window 2"),
            Some(PipeConsumerClass::Move {
                window_id: 2,
                group_id: -1,
                ungroup: true,
            })
        );
        assert_eq!(classify_pipe_consumer("move --ungroup --group 1 --window 2"), None);
    }

    #[test]
    fn json_null_and_id() {
        assert_eq!(classify_pipe_consumer_json("nope"), "null");
        let raw = classify_pipe_consumer_json("jump");
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v["id"], "jump");
    }
}
