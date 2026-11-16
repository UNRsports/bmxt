use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.jump.usage.line1",
    "cmd.jump.usage.line2",
    "cmd.jump.usage.line3",
    "cmd.jump.usage.line4",
];

fn usage() -> DispatchBundle {
    msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
}

fn parse_i64_flag(args: &[String], name: &str) -> Option<i64> {
    let mut i = 1;
    while i + 1 < args.len() {
        if args[i] == name {
            return args[i + 1].parse::<i64>().ok().filter(|n| *n >= 0);
        }
        i += 1;
    }
    None
}

fn parse_string_flag(args: &[String], name: &str) -> Option<String> {
    let mut i = 1;
    while i + 1 < args.len() {
        if args[i] == name {
            let value = args[i + 1].trim();
            if value.is_empty() {
                return None;
            }
            return Some(value.to_string());
        }
        i += 1;
    }
    None
}

/// EN: Bare `jump` prints usage. Direct form encodes one target for picker → submitLine.
///     Batch jump is `<list> | jump` (host pipe consumer).
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }

    let Some(tab_id) = parse_i64_flag(args, "--tab") else {
        return msgs(vec![msg_param(
            "cmd.jump.error.needTab",
            "hint",
            "--tab <tabId>",
        )]);
    };

    let path = parse_string_flag(args, "--path").unwrap_or_default();
    let needle = parse_string_flag(args, "--needle").unwrap_or_default();
    let line = parse_i64_flag(args, "--line").unwrap_or(-1);
    let match_index = parse_i64_flag(args, "--match-index").unwrap_or(0);
    let url = parse_string_flag(args, "--url").unwrap_or_default();
    let activate_link: i64 = if args.iter().any(|a| a == "--link") {
        1
    } else {
        0
    };

    if path.is_empty() && needle.is_empty() && url.is_empty() {
        return usage();
    }

    ui(UiAction::JumpTarget {
        tab_id,
        path,
        needle,
        line,
        match_index,
        url,
        activate_link,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_prints_usage() {
        let bundle = run(&["jump".into()]);
        match bundle {
            DispatchBundle::Msgs { msgs, .. } => assert!(!msgs.is_empty()),
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn tab_path_emits_jump_ui() {
        let bundle = run(&[
            "jump".into(),
            "--tab".into(),
            "12".into(),
            "--path".into(),
            "0.1.2".into(),
        ]);
        match bundle {
            DispatchBundle::Ui {
                action:
                    UiAction::JumpTarget {
                        tab_id,
                        path,
                        activate_link,
                        ..
                    },
            } => {
                assert_eq!(tab_id, 12);
                assert_eq!(path, "0.1.2");
                assert_eq!(activate_link, 0);
            }
            other => panic!("unexpected: {other:?}"),
        }
    }
}
