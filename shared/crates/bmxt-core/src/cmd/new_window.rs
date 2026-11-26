use crate::ir::{effects, msg_key, msgs, HostEffect, DispatchBundle};

const USAGE_KEYS: &[&str] = &[
    "cmd.newWindow.usage.line1",
    "cmd.newWindow.usage.line2",
    "cmd.newWindow.usage.line3",
];

fn usage() -> DispatchBundle {
    msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
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
        if token == "--as-group" {
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

/// EN: `new-window [--as-group <gid>…] <tabId>…` or pipe `| new-window [--as-group …]`.
/// JA: `--as-group` はタブグループを単位のまま新ウィンドウへ移す（逐次 tabGroups.move）。
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }
    let group_ids = parse_as_group_ids(args);
    let tab_ids = parse_tab_ids(args);
    if tab_ids.is_empty() && group_ids.is_empty() {
        return usage();
    }
    effects(vec![HostEffect::TabsNewWindow { tab_ids, group_ids }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_emit_new_window() {
        let bundle = run(&["new-window".into(), "1".into(), "2".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsNewWindow { tab_ids, group_ids } => {
                    assert_eq!(tab_ids, &vec![1, 2]);
                    assert!(group_ids.is_empty());
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn as_group_emits_group_ids() {
        let bundle = run(&[
            "new-window".into(),
            "--as-group".into(),
            "10".into(),
            "--as-group".into(),
            "11".into(),
            "1".into(),
            "2".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsNewWindow { tab_ids, group_ids } => {
                    assert_eq!(tab_ids, &vec![1, 2]);
                    assert_eq!(group_ids, &vec![10, 11]);
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }
}
