//! Full command-line dispatch: URL 行、トークン化、コマンド解決、Lines / Effects。

use crate::registry;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DispatchJson {
    pub ty: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lines: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effects: Option<Vec<Effect>>,
}

impl DispatchJson {
    fn lines(lines: Vec<String>) -> Self {
        Self {
            ty: "lines",
            lines: Some(lines),
            effects: None,
        }
    }
    fn effects(effects: Vec<Effect>) -> Self {
        Self {
            ty: "effects",
            lines: None,
            effects: Some(effects),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Effect {
    ClearLog,
    ListWindows,
    FocusInfo,
    Activate { tab_id: i32 },
    CloseTab { tab_id: i32 },
    GoBack {
        tab_id_arg: Option<String>,
    },
    GoForward {
        tab_id_arg: Option<String>,
    },
    MoveTab {
        tab_id: i32,
        window_id: i32,
        index: Option<i32>,
    },
    NewTab {
        url: Option<String>,
    },
    ListTabGroups,
    GroupNew {
        tab_ids: Vec<i32>,
    },
    TabsNu,
    TabsMoveUrl { url: String },
    OpenUrlNewWindow { url: String },
    NavigateCurrentTab { url: String },
    OpenUrlNewTab { url: String },
}

pub fn dispatch_full(line: &str) -> String {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return serde_json::to_string(&DispatchJson::lines(vec![])).unwrap();
    }
    if let Some(out) = try_url_line(trimmed) {
        return serde_json::to_string(&out).unwrap();
    }
    let args = tokenize(trimmed);
    if args.is_empty() {
        return serde_json::to_string(&DispatchJson::lines(vec![])).unwrap();
    }
    let cmd_token = args[0].to_lowercase();
    let Some(canonical) = registry::resolve_canonical(&cmd_token) else {
        return serde_json::to_string(&DispatchJson::lines(vec![format!(
            "unknown command: {}. Type help.",
            cmd_token
        )]))
        .unwrap();
    };
    let out = handle_command(canonical, &args);
    serde_json::to_string(&out).unwrap()
}

fn tokenize(line: &str) -> Vec<String> {
    line.trim()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

fn parse_http_url_candidate(inner: &str) -> Option<String> {
    let t = inner.trim();
    if t.is_empty() || t.chars().any(|c| c.is_whitespace()) {
        return None;
    }
    let lower = t.to_ascii_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return None;
    }
    Some(t.to_string())
}

fn try_url_line(trimmed: &str) -> Option<DispatchJson> {
    if trimmed.len() >= 4 {
        let suf = &trimmed[trimmed.len() - 4..];
        if suf.eq_ignore_ascii_case(" -nw") {
            let inner = trimmed[..trimmed.len() - 4].trim_end();
            let url = parse_http_url_candidate(inner)?;
            return Some(DispatchJson::effects(vec![Effect::OpenUrlNewWindow { url }]));
        }
    }
    if trimmed.ends_with(" .") && trimmed.len() >= 2 {
        let inner = trimmed[..trimmed.len() - 2].trim_end();
        let url = parse_http_url_candidate(inner)?;
        return Some(DispatchJson::effects(vec![Effect::NavigateCurrentTab { url }]));
    }
    if !trimmed.chars().any(|c| c.is_whitespace()) {
        let url = parse_http_url_candidate(trimmed)?;
        return Some(DispatchJson::effects(vec![Effect::OpenUrlNewTab { url }]));
    }
    None
}

fn tabs_usage_lines() -> Vec<String> {
    vec![
        "usage: tabs -l|-list [-u]   — tab picker (optional -u: show each tab URL)".to_string(),
        "       tabs -mu|-moveurl <url> — go to tab with URL or open new tab (Tab completes URLs in BMXt)".to_string(),
        "       tabs -nu|-nowurl       — show current tab URL".to_string(),
    ]
}

fn tabs_run_hint_line() -> String {
    "Run:  tabs -l  or  tabs -l -u  (picker).  tabs -nu  (current URL).  tabs -mu <url>  (jump or new tab)."
        .to_string()
}

fn norm_tabs_flag(arg: Option<&String>) -> Option<char> {
    let a = arg?.to_lowercase();
    match a.as_str() {
        "-l" | "-list" | "--list" => Some('l'),
        "-mu" | "-moveurl" | "--moveurl" => Some('m'),
        "-nu" | "-nowurl" | "--nowurl" => Some('n'),
        _ => None,
    }
}

fn handle_command(canonical: &str, args: &[String]) -> DispatchJson {
    match canonical {
        "help" => DispatchJson::lines(registry::build_help_lines()),
        "man" => {
            let topic = args.get(1).map(|s| s.as_str());
            if topic.is_none() || topic == Some("") {
                let topics = registry::list_man_topics().join(", ");
                return DispatchJson::lines(vec![
                    "USAGE: man <topic>".to_string(),
                    String::new(),
                    "Available topics:".to_string(),
                    format!("  {}", topics),
                ]);
            }
            let topic = topic.unwrap();
            match registry::get_man_lines(topic) {
                Some(page) => DispatchJson::lines(page),
                None => DispatchJson::lines(vec![format!(
                    "no manual entry for \"{}\". Try: man",
                    topic
                )]),
            }
        }
        "echo" => {
            let joined = args.iter().skip(1).cloned().collect::<Vec<_>>().join(" ");
            DispatchJson::lines(vec![format_echo(&joined)])
        }
        "clear" => DispatchJson::effects(vec![Effect::ClearLog]),
        "windows" => DispatchJson::effects(vec![Effect::ListWindows]),
        "focus" => DispatchJson::effects(vec![Effect::FocusInfo]),
        "groups" => DispatchJson::effects(vec![Effect::ListTabGroups]),
        "activate" => {
            let Some(id) = args.get(1).and_then(|s| s.parse::<i32>().ok()) else {
                return DispatchJson::lines(vec!["usage: activate <tabId>".to_string()]);
            };
            DispatchJson::effects(vec![Effect::Activate { tab_id: id }])
        }
        "close" => {
            let Some(id) = args.get(1).and_then(|s| s.parse::<i32>().ok()) else {
                return DispatchJson::lines(vec!["usage: close <tabId>".to_string()]);
            };
            DispatchJson::effects(vec![Effect::CloseTab { tab_id: id }])
        }
        "back" => {
            let tab_arg = args.get(1).cloned();
            DispatchJson::effects(vec![Effect::GoBack { tab_id_arg: tab_arg }])
        }
        "forward" => {
            let tab_arg = args.get(1).cloned();
            DispatchJson::effects(vec![Effect::GoForward { tab_id_arg: tab_arg }])
        }
        "move" => {
            let tab_id = args.get(1).and_then(|s| s.parse::<i32>().ok());
            let window_id = args.get(2).and_then(|s| s.parse::<i32>().ok());
            if tab_id.is_none() || window_id.is_none() {
                return DispatchJson::lines(vec![
                    "usage: move <tabId> <windowId> [index]".to_string(),
                    "  index defaults to end of target window".to_string(),
                ]);
            }
            let tab_id = tab_id.unwrap();
            let window_id = window_id.unwrap();
            let index_arg = args.get(3);
            let index = if let Some(s) = index_arg {
                match s.parse::<i32>() {
                    Ok(i) => Some(i),
                    Err(_) => {
                        return DispatchJson::lines(vec!["invalid index".to_string()]);
                    }
                }
            } else {
                None
            };
            DispatchJson::effects(vec![Effect::MoveTab {
                tab_id,
                window_id,
                index,
            }])
        }
        "new" => {
            let url = args.get(1).cloned();
            DispatchJson::effects(vec![Effect::NewTab { url }])
        }
        "group" => {
            if args.get(1).map(|s| s.to_lowercase()).as_deref() != Some("new") {
                return DispatchJson::lines(vec![
                    "usage: group new | group new <tabId> [tabId ...]".to_string(),
                ]);
            }
            let tab_ids: Vec<i32> = args
                .iter()
                .skip(2)
                .filter_map(|s| s.parse::<i32>().ok())
                .collect();
            if tab_ids.is_empty() {
                return DispatchJson::lines(vec![
                    "Interactive: in BMXt type  group new  and Enter (no tab ids).".to_string(),
                    "Non-interactive: group new <tabId> [tabId ...]".to_string(),
                ]);
            }
            DispatchJson::effects(vec![Effect::GroupNew { tab_ids }])
        }
        "tabs" => {
            let sub = norm_tabs_flag(args.get(1));
            if sub.is_none() {
                if args.get(1).is_none() {
                    let mut lines = vec!["error: tabs requires a subcommand.".to_string()];
                    lines.extend(tabs_usage_lines());
                    return DispatchJson::lines(lines);
                }
                let mut lines = vec![format!(
                    "error: unknown tabs option: {}",
                    args.get(1).map(|s| s.as_str()).unwrap_or("")
                )];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            match sub.unwrap() {
                'l' => {
                    if args.len() > 3 || (args.len() == 3 && args[2].to_lowercase() != "-u") {
                        let mut lines = vec!["error: invalid tabs -l usage".to_string()];
                        lines.extend(tabs_usage_lines());
                        return DispatchJson::lines(lines);
                    }
                    DispatchJson::lines(vec![
                        "Tab picker is opened from the BMXt prompt with:  tabs -l   or   tabs -l -u"
                            .to_string(),
                        tabs_run_hint_line(),
                    ])
                }
                'n' => {
                    if args.len() > 2 {
                        let mut lines = vec!["error: too many arguments".to_string()];
                        lines.extend(tabs_usage_lines());
                        return DispatchJson::lines(lines);
                    }
                    DispatchJson::effects(vec![Effect::TabsNu])
                }
                'm' => {
                    let url_part = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
                    let url_part = url_part.trim();
                    if url_part.is_empty() {
                        let mut lines = vec!["usage: tabs -mu|-moveurl <http(s)-url>".to_string()];
                        lines.extend(tabs_usage_lines());
                        return DispatchJson::lines(lines);
                    }
                    let Some(url) = parse_http_url_candidate(url_part) else {
                        let mut lines = vec!["usage: tabs -mu|-moveurl <http(s)-url>".to_string()];
                        lines.extend(tabs_usage_lines());
                        return DispatchJson::lines(lines);
                    };
                    DispatchJson::effects(vec![Effect::TabsMoveUrl { url }])
                }
                _ => unreachable!(),
            }
        }
        _ => DispatchJson::lines(vec![format!(
            "internal: unhandled command {}",
            canonical
        )]),
    }
}

fn format_echo(joined: &str) -> String {
    if joined.is_empty() {
        "(empty)".to_string()
    } else {
        joined.to_string()
    }
}
