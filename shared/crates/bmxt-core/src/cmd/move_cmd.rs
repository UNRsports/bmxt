use crate::ir::{effects, msg_key, msgs, HostEffect, DispatchBundle};

const USAGE_KEYS: &[&str] = &[
    "cmd.move.usage.line1",
    "cmd.move.usage.line2",
    "cmd.move.usage.line3",
    "cmd.move.usage.line4",
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

fn is_flag_with_value(token: &str) -> bool {
    token == "--window"
        || token == "--group"
        || token == "--before-tab"
        || token == "--as-group"
}

fn parse_as_group_ids(args: &[String]) -> Vec<i64> {
    let mut out = Vec::new();
    let mut i = 1;
    while i + 1 < args.len() {
        if args[i] == "--as-group" {
            if let Ok(id) = args[i + 1].parse::<i64>() {
                if id >= 0 {
                    out.push(id);
                }
            }
            i += 2;
            continue;
        }
        i += 1;
    }
    out
}

fn parse_tab_ids(args: &[String]) -> Vec<i64> {
    let mut out = Vec::new();
    let mut i = 1;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--ungroup" {
            i += 1;
            continue;
        }
        if is_flag_with_value(token) {
            i += 2;
            continue;
        }
        if token.starts_with('-') {
            i += 1;
            continue;
        }
        if let Ok(id) = token.parse::<i64>() {
            if id >= 0 {
                out.push(id);
            }
        }
        i += 1;
    }
    out
}

/// EN: `move --window <id> [--before-tab <tabId>] [--as-group <gid>…] [tabId…]`
///     / `move --group <gid> --window <wid> [--before-tab <tabId>] [tabId…]`
///     / `move --ungroup --window <id> [tabId…]`. Batch via pipe `| move …`.
/// JA: `--as-group` は移動元タブグループを単位移動（chrome.tabGroups.move）。宛先 `--group` と併用不可。
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }
    let window_id = parse_i64_flag(args, "--window");
    let group_id = parse_i64_flag(args, "--group");
    let before_tab_id = parse_i64_flag(args, "--before-tab").unwrap_or(-1);
    let ungroup = args.iter().any(|a| a == "--ungroup");
    let as_group_ids = parse_as_group_ids(args);
    let tab_ids = parse_tab_ids(args);

    let Some(wid) = window_id else {
        return usage();
    };
    if group_id.is_some() && ungroup {
        return usage();
    }
    if group_id.is_some() && !as_group_ids.is_empty() {
        return usage();
    }
    if ungroup && !as_group_ids.is_empty() {
        return usage();
    }
    if tab_ids.is_empty() && as_group_ids.is_empty() {
        // EN: Pipe consumer supplies tab ids; bare flags alone print usage when typed.
        return usage();
    }

    let gid = if ungroup {
        0
    } else if let Some(g) = group_id {
        g
    } else {
        -1
    };

    effects(vec![HostEffect::TabsMove {
        tab_ids,
        window_id: wid,
        group_id: gid,
        before_tab_id,
        group_ids: as_group_ids,
    }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn move_window_emits_effect() {
        let bundle = run(&[
            "move".into(),
            "--window".into(),
            "4".into(),
            "10".into(),
            "11".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsMove {
                    tab_ids,
                    window_id,
                    group_id,
                    before_tab_id,
                    group_ids,
                } => {
                    assert_eq!(tab_ids, &vec![10, 11]);
                    assert_eq!(*window_id, 4);
                    assert_eq!(*group_id, -1);
                    assert_eq!(*before_tab_id, -1);
                    assert!(group_ids.is_empty());
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn move_before_tab_emits_effect() {
        let bundle = run(&[
            "move".into(),
            "--window".into(),
            "4".into(),
            "--before-tab".into(),
            "99".into(),
            "10".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsMove {
                    tab_ids,
                    window_id,
                    before_tab_id,
                    group_ids,
                    ..
                } => {
                    assert_eq!(tab_ids, &vec![10]);
                    assert_eq!(*window_id, 4);
                    assert_eq!(*before_tab_id, 99);
                    assert!(group_ids.is_empty());
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn move_as_group_emits_group_ids() {
        let bundle = run(&[
            "move".into(),
            "--window".into(),
            "4".into(),
            "--as-group".into(),
            "10".into(),
            "--as-group".into(),
            "11".into(),
            "100".into(),
            "101".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsMove {
                    tab_ids,
                    window_id,
                    group_id,
                    group_ids,
                    ..
                } => {
                    assert_eq!(tab_ids, &vec![100, 101]);
                    assert_eq!(*window_id, 4);
                    assert_eq!(*group_id, -1);
                    assert_eq!(group_ids, &vec![10, 11]);
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn move_as_group_with_dest_group_is_usage() {
        let bundle = run(&[
            "move".into(),
            "--window".into(),
            "4".into(),
            "--group".into(),
            "5".into(),
            "--as-group".into(),
            "10".into(),
            "100".into(),
        ]);
        match bundle {
            DispatchBundle::Msgs { .. } => {}
            other => panic!("expected usage msgs, got {other:?}"),
        }
    }
}
