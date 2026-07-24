use crate::cmd::helpers::normalize_token;
use crate::ir::{msg_key, msgs, ui, DispatchBundle, Msg, UiAction};

/** EN: Ordered full-help section keys (host expands via expand-msgs). */
const FULL_HELP_SECTION_KEYS: &[&str] = &[
    "help.section.tabs",
    "help.section.session",
    "help.section.dom",
    "help.section.translate",
    "help.section.setting",
    "help.section.search",
    "help.section.url",
    "help.section.keys",
];

/** EN: Map first command → help.section.* key when a dedicated manual exists. */
fn section_key_for_command(canonical: &str) -> Option<&'static str> {
    match canonical {
        "tab" => Some("help.section.tabs"),
        "dom" => Some("help.section.dom"),
        "search" => Some("help.section.search"),
        "session" => Some("help.section.session"),
        "setting" => Some("help.section.setting"),
        "translate" => Some("help.section.translate"),
        _ => None,
    }
}

fn full_help_msgs() -> Vec<Msg> {
    let mut out = vec![
        msg_key("help.title"),
        msg_key("help.quickStart"),
        msg_key("help.spacer"),
        msg_key("help.builtInCommandsHeader"),
        msg_key("help.builtInCommandUsages"),
    ];
    for key in FULL_HELP_SECTION_KEYS {
        out.push(msg_key("help.spacer"));
        out.push(msg_key(key));
    }
    out
}

pub fn run(_args: &[String]) -> DispatchBundle {
    msgs(full_help_msgs())
}

/**
 * EN: `\<cmd\> help` — show that command's manual section (or full help as fallback).
 * Returns `None` when the second token is not `help`.
 */
pub fn try_section_help(canonical: &str, args: &[String]) -> Option<DispatchBundle> {
    let second = args.get(1)?;
    if normalize_token(second) != "help" {
        return None;
    }
    if let Some(key) = section_key_for_command(canonical) {
        return Some(msgs(vec![msg_key(key)]));
    }
    Some(msgs(full_help_msgs()))
}

/** EN: Kept for UiAction IR completeness; prefer `run` msgs path. */
#[allow(dead_code)]
pub fn show_help_ui() -> DispatchBundle {
    ui(UiAction::ShowHelp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn tabs_help_emits_section_msg() {
        let args = vec!["tab".to_string(), "help".to_string()];
        match try_section_help("tab", &args) {
            Some(DispatchBundle::Msgs { msgs, .. }) => {
                assert_eq!(msgs[0].key, "help.section.tabs");
            }
            other => panic!("expected section msgs, got {other:?}"),
        }
    }

    #[test]
    fn non_help_second_token_is_none() {
        let args = vec!["tab".to_string(), "-list".to_string()];
        assert!(try_section_help("tab", &args).is_none());
    }

    #[test]
    fn full_help_includes_section_keys() {
        match run(&[]) {
            DispatchBundle::Msgs { msgs, .. } => {
                assert!(msgs.iter().any(|m| m.key == "help.section.tabs"));
                assert!(msgs.iter().any(|m| m.key == "help.builtInCommandUsages"));
            }
            other => panic!("expected msgs, got {other:?}"),
        }
    }
}
