use crate::cmd::helpers::normalize_token;
use crate::ir::{msg_key, msgs, ui, DispatchBundle, UiAction};

pub fn run(_args: &[String]) -> DispatchBundle {
    ui(UiAction::ShowHelp)
}

/** EN: Map first command → help.section.* key when a dedicated manual exists. */
fn section_key_for_command(canonical: &str) -> Option<&'static str> {
    match canonical {
        "tabs" => Some("help.section.tabs"),
        "dom" => Some("help.section.dom"),
        "search" => Some("help.section.search"),
        "session" => Some("help.section.session"),
        "setting" => Some("help.section.setting"),
        "translate" => Some("help.section.translate"),
        _ => None,
    }
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
    Some(ui(UiAction::ShowHelp))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn tabs_help_emits_section_msg() {
        let args = vec!["tabs".to_string(), "help".to_string()];
        match try_section_help("tabs", &args) {
            Some(DispatchBundle::Msgs { msgs, .. }) => {
                assert_eq!(msgs[0].key, "help.section.tabs");
            }
            other => panic!("expected section msgs, got {other:?}"),
        }
    }

    #[test]
    fn non_help_second_token_is_none() {
        let args = vec!["tabs".to_string(), "-list".to_string()];
        assert!(try_section_help("tabs", &args).is_none());
    }
}
