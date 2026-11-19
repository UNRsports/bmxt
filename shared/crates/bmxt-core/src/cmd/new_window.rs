use crate::ir::{effects, msg_key, msgs, HostEffect, DispatchBundle};

const USAGE_KEYS: &[&str] = &[
    "cmd.newWindow.usage.line1",
    "cmd.newWindow.usage.line2",
    "cmd.newWindow.usage.line3",
];

fn usage() -> DispatchBundle {
    msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
}

/// EN: `new-window <tabId>…` or pipe `| new-window`.
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }
    let tab_ids: Vec<i64> = args
        .iter()
        .skip(1)
        .filter_map(|s| s.parse::<i64>().ok())
        .filter(|n| *n >= 0)
        .collect();
    if tab_ids.is_empty() {
        return usage();
    }
    effects(vec![HostEffect::TabsNewWindow { tab_ids }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_emit_new_window() {
        let bundle = run(&["new-window".into(), "1".into(), "2".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::TabsNewWindow { tab_ids } => assert_eq!(tab_ids, &vec![1, 2]),
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }
}
