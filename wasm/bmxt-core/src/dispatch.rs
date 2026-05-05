//! URL 行・トークン化・コマンド委譲。本体は `crate::cmd::*::run`。

use crate::cmd::{
    activate, back, clear, close, echo, exit, focus, forward, group, groups, help_cmd, man_page,
    move_tab, new_tab, tabs, windows,
};
use crate::line_parse::{parse_http_url_candidate, tokenize};
use crate::model::{DispatchJson, Effect};

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

type DispatchCmdFn = fn(&[String]) -> DispatchJson;

/// `registry::table::COMMANDS` と名前集合が一致すること（テストで検証）。
static COMMAND_RUNNERS: &[(&str, DispatchCmdFn)] = &[
    ("activate", activate::run),
    ("back", back::run),
    ("clear", clear::run),
    ("close", close::run),
    ("echo", echo::run),
    ("exit", exit::run),
    ("focus", focus::run),
    ("forward", forward::run),
    ("group", group::run),
    ("groups", groups::run),
    ("help", help_cmd::run),
    ("man", man_page::run),
    ("move", move_tab::run),
    ("new", new_tab::run),
    ("tabs", tabs::run),
    ("windows", windows::run),
];

fn handle_command(canonical: &str, args: &[String]) -> DispatchJson {
    COMMAND_RUNNERS
        .iter()
        .find(|(name, _)| *name == canonical)
        .map(|(_, run)| run(args))
        .unwrap_or_else(|| {
            DispatchJson::lines(vec![format!(
                "internal: unhandled command {}",
                canonical
            )])
        })
}

#[cfg(test)]
mod tests {
    use super::{dispatch_full, COMMAND_RUNNERS};
    use crate::registry::table::COMMANDS;
    use std::collections::HashSet;

    #[test]
    fn every_registry_command_dispatches_without_internal_unhandled() {
        for cmd in COMMANDS {
            let out = dispatch_full(cmd.name);
            assert!(
                !out.contains("internal: unhandled command"),
                "{} -> {}",
                cmd.name,
                out
            );
        }
    }

    #[test]
    fn command_runners_match_registry_table() {
        let from_registry: HashSet<&str> = COMMANDS.iter().map(|c| c.name).collect();
        let from_runners: HashSet<&str> = COMMAND_RUNNERS.iter().map(|(n, _)| *n).collect();
        assert_eq!(
            from_registry,
            from_runners,
            "COMMAND_RUNNERS と registry::table::COMMANDS の名前集合を一致させてください"
        );
    }
}
