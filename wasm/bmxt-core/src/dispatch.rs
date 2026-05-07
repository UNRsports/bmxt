//! URL 行・トークン化・コマンド委譲。本体は `crate::cmd::*::run`。

use crate::line_parse::{parse_http_url_candidate, tokenize};
use crate::model::{DispatchJson, Effect};
use crate::registry::table::COMMAND_RUNNERS;

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
    use super::dispatch_full;
    use crate::registry::table::{COMMANDS, COMMAND_RUNNERS};
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
