//! URL 行・トークン化・コマンド委譲。本体は `crate::cmd::*::run`。

use crate::line_parse::{parse_http_url_candidate, tokenize};
use crate::model::{DispatchJson, Effect};
use crate::registry::table::COMMAND_RUNNERS;

fn dispatch_json_string(out: &DispatchJson) -> String {
    serde_json::to_string(out).unwrap_or_else(|e| {
        serde_json::to_string(&DispatchJson::lines(vec![format!(
            "error: internal dispatch json: {e}"
        )]))
        .unwrap_or_else(|_| {
            "{\"ty\":\"lines\",\"lines\":[\"error: internal dispatch json (fallback)\"]}".to_string()
        })
    })
}

pub fn dispatch_full(line: &str) -> String {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return dispatch_json_string(&DispatchJson::lines(vec![]));
    }
    if let Some(out) = try_url_line(trimmed) {
        return dispatch_json_string(&out);
    }
    let args = tokenize(trimmed);
    if args.is_empty() {
        return dispatch_json_string(&DispatchJson::lines(vec![]));
    }
    let cmd_token = args[0].to_lowercase();
    let Some(canonical) = crate::registry::resolve_canonical(&cmd_token) else {
        return dispatch_json_string(&DispatchJson::lines(vec![format!(
            "unknown command: {}. Type help.",
            cmd_token
        )]));
    };
    let out = handle_command(canonical, &args);
    dispatch_json_string(&out)
}

fn try_url_line(trimmed: &str) -> Option<DispatchJson> {
    const NW_SUFFIXES: [&str; 4] = [" -nw", " -nW", " -Nw", " -NW"];
    for suf in NW_SUFFIXES {
        if let Some(inner) = trimmed.strip_suffix(suf) {
            let inner = inner.trim_end();
            let url = parse_http_url_candidate(inner)?;
            return Some(DispatchJson::effects(vec![Effect::OpenUrlNewWindow { url }]));
        }
    }
    if let Some(inner) = trimmed.strip_suffix(" .") {
        let inner = inner.trim_end();
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

    #[test]
    fn grep_page_plain_japanese_does_not_panic() {
        let out = dispatch_full("grep -page 変わる");
        assert!(
            !out.to_ascii_lowercase().contains("unreachable"),
            "unexpected trap: {out}"
        );
        assert!(out.contains("grep_page"), "expected grep_page: {out}");
    }

    #[test]
    fn grep_page_japanese_no_unreachable_with_zwsp_on_flag() {
        let line = format!("grep -page\u{200b} 変わる");
        let out = dispatch_full(&line);
        assert!(
            !out.to_ascii_lowercase().contains("unreachable"),
            "unexpected trap: {out}"
        );
        assert!(
            out.contains("grep_page") && out.contains("変わる"),
            "expected grep_page effect: {out}"
        );
    }
}
