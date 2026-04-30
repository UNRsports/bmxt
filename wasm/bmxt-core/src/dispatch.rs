//! URL 行・トークン化・コマンド委譲。本体は `crate::cmd::*::run`。

use crate::cmd::{
    activate, back, clear, close, echo, exit, focus, forward, group, groups, move_tab, new_tab,
    tabs, windows,
};
use crate::line_parse::{parse_http_url_candidate, tokenize};
use crate::model::{DispatchJson, Effect};
use crate::registry::api;

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
    let Some(canonical) = crate::registry::resolve_canonical(&cmd_token) else {
        return serde_json::to_string(&DispatchJson::lines(vec![format!(
            "unknown command: {}. Type help.",
            cmd_token
        )]))
        .unwrap();
    };
    let out = handle_command(canonical, &args);
    serde_json::to_string(&out).unwrap()
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

fn handle_command(canonical: &str, args: &[String]) -> DispatchJson {
    match canonical {
        "help" => DispatchJson::lines(api::build_help_lines()),
        "man" => {
            let topic = args.get(1).map(|s| s.as_str());
            if topic.is_none() || topic == Some("") {
                let topics = api::list_man_topics().join(", ");
                return DispatchJson::lines(vec![
                    "USAGE: man <topic>".to_string(),
                    String::new(),
                    "Available topics:".to_string(),
                    format!("  {}", topics),
                ]);
            }
            let topic = topic.unwrap();
            match api::get_man_lines(topic) {
                Some(page) => DispatchJson::lines(page),
                None => DispatchJson::lines(vec![format!(
                    "no manual entry for \"{}\". Try: man",
                    topic
                )]),
            }
        }
        "echo" => echo::run(args),
        "clear" => clear::run(args),
        "exit" => exit::run(args),
        "windows" => windows::run(args),
        "focus" => focus::run(args),
        "groups" => groups::run(args),
        "activate" => activate::run(args),
        "close" => close::run(args),
        "back" => back::run(args),
        "forward" => forward::run(args),
        "move" => move_tab::run(args),
        "new" => new_tab::run(args),
        "group" => group::run(args),
        "tabs" => tabs::run(args),
        _ => DispatchJson::lines(vec![format!(
            "internal: unhandled command {}",
            canonical
        )]),
    }
}
