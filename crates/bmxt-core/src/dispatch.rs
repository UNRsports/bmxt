use crate::cmd;
use crate::generated::{all_command_metas, resolve_canonical};
use crate::ir::{
    effects, lines, msg_param, msg_with, msgs, ChromeEffect, DispatchBundle,
};
use crate::line_parse::{parse_http_url_candidate, tokenize};
use std::collections::BTreeMap;

/** EN: Prefix-match registered command names for an unknown first token. */
fn suggest_command_names(token: &str) -> Vec<&'static str> {
    if token.is_empty() {
        return Vec::new();
    }
    let mut out: Vec<&'static str> = Vec::new();
    for meta in all_command_metas() {
        if meta.name.starts_with(token) && meta.name != token {
            out.push(meta.name);
        }
    }
    out.sort_unstable();
    out.dedup();
    out
}

fn unknown_command_msgs(cmd_token: &str) -> DispatchBundle {
    let suggestions = suggest_command_names(cmd_token);
    if suggestions.is_empty() {
        return msgs(vec![msg_param(
            "cmd.error.unknownCommand",
            "cmdToken",
            cmd_token,
        )]);
    }
    let mut params = BTreeMap::new();
    params.insert("cmdToken".to_string(), cmd_token.to_string());
    params.insert("suggestions".to_string(), suggestions.join(", "));
    msgs(vec![msg_with("cmd.error.unknownCommandSuggest", params)])
}

fn try_url_line(trimmed: &str) -> Option<DispatchBundle> {
    const NW_SUFFIXES: &[&str] = &[" -nw", " -nW", " -Nw", " -NW"];
    for suf in NW_SUFFIXES {
        if trimmed.ends_with(suf) {
            let inner = trimmed[..trimmed.len() - suf.len()].trim_end();
            if let Some(url) = parse_http_url_candidate(inner) {
                return Some(effects(vec![ChromeEffect::OpenUrlNewWindow { url }]));
            }
        }
    }
    if trimmed.ends_with(" .") {
        let inner = trimmed[..trimmed.len() - 2].trim_end();
        if let Some(url) = parse_http_url_candidate(inner) {
            return Some(effects(vec![ChromeEffect::NavigateCurrentTab { url }]));
        }
    }
    if !trimmed.contains(char::is_whitespace) {
        if let Some(url) = parse_http_url_candidate(trimmed) {
            return Some(effects(vec![ChromeEffect::OpenUrlNewTab { url }]));
        }
    }
    None
}

pub fn run_line(line: &str) -> DispatchBundle {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return lines(vec![]);
    }
    if let Some(out) = try_url_line(trimmed) {
        return out;
    }
    let args = tokenize(trimmed);
    if args.is_empty() {
        return lines(vec![]);
    }
    let cmd_token = args[0].to_ascii_lowercase();
    let Some(canonical) = resolve_canonical(&cmd_token) else {
        return unknown_command_msgs(&cmd_token);
    };
    cmd::run_command(canonical, &args)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn empty_line_returns_empty_lines() {
        match run_line("   ") {
            DispatchBundle::Lines { lines } => assert!(lines.is_empty()),
            other => panic!("expected lines, got {other:?}"),
        }
    }

    #[test]
    fn unknown_command_returns_msg() {
        match run_line("notacommand") {
            DispatchBundle::Msgs { msgs, .. } => {
                assert_eq!(msgs[0].key, "cmd.error.unknownCommand");
            }
            other => panic!("expected msgs, got {other:?}"),
        }
    }

    #[test]
    fn unknown_command_prefix_suggests_registry_match() {
        match run_line("tab") {
            DispatchBundle::Msgs { msgs, .. } => {
                assert_eq!(msgs[0].key, "cmd.error.unknownCommandSuggest");
                let params = msgs[0].params.as_ref().expect("params");
                assert_eq!(params.get("cmdToken").map(String::as_str), Some("tab"));
                assert_eq!(params.get("suggestions").map(String::as_str), Some("tabs"));
            }
            other => panic!("expected msgs, got {other:?}"),
        }
    }
}
