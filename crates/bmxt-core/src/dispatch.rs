use crate::cmd;
use crate::generated::resolve_canonical;
use crate::ir::{effects, lines, msg_param, msgs, ChromeEffect, DispatchBundle};
use crate::line_parse::{parse_http_url_candidate, tokenize};

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
        return msgs(vec![msg_param(
            "cmd.error.unknownCommand",
            "cmdToken",
            &cmd_token,
        )]);
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
}
