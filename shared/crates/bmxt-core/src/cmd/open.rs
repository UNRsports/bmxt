use crate::ir::{effects, msg_key, msgs, HostEffect, DispatchBundle};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.open.usage.line1",
    "cmd.open.usage.line2",
    "cmd.open.usage.line3",
    "cmd.open.usage.line4",
    "cmd.open.usage.line5",
];

fn usage() -> DispatchBundle {
    msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
}

fn parse_i64_after(args: &[String], flag: &str) -> Option<i64> {
    let mut i = 1;
    while i + 1 < args.len() {
        if args[i] == flag {
            return args[i + 1].parse::<i64>().ok().filter(|n| *n >= 0);
        }
        i += 1;
    }
    None
}

/// EN: `open <url>` / `--window` / `--into-window <id>` / `--into-group <gid> --window-id <wid>`.
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }

    let mut new_window = false;
    let mut into_window: Option<i64> = None;
    let mut into_group: Option<i64> = None;
    let mut window_id_for_group: Option<i64> = None;
    let mut url_arg: Option<&str> = None;
    let mut i = 1;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--window" {
            new_window = true;
            i += 1;
            continue;
        }
        if token == "--into-window" {
            if i + 1 >= args.len() {
                return usage();
            }
            let Ok(id) = args[i + 1].parse::<i64>() else {
                return usage();
            };
            if id < 0 {
                return usage();
            }
            into_window = Some(id);
            i += 2;
            continue;
        }
        if token == "--into-group" {
            if i + 1 >= args.len() {
                return usage();
            }
            let Ok(id) = args[i + 1].parse::<i64>() else {
                return usage();
            };
            if id < 0 {
                return usage();
            }
            into_group = Some(id);
            i += 2;
            continue;
        }
        if token == "--window-id" {
            if i + 1 >= args.len() {
                return usage();
            }
            let Ok(id) = args[i + 1].parse::<i64>() else {
                return usage();
            };
            if id < 0 {
                return usage();
            }
            window_id_for_group = Some(id);
            i += 2;
            continue;
        }
        if token.starts_with('-') {
            return usage();
        }
        if url_arg.is_some() {
            return usage();
        }
        url_arg = Some(token);
        i += 1;
    }

    let Some(raw) = url_arg else {
        return usage();
    };
    let Some(url) = parse_http_url_candidate(raw) else {
        return usage();
    };

    let mode_count = [
        new_window,
        into_window.is_some(),
        into_group.is_some(),
    ]
    .iter()
    .filter(|v| **v)
    .count();
    if mode_count > 1 {
        return usage();
    }

    if let Some(group_id) = into_group {
        let Some(window_id) = window_id_for_group.or_else(|| parse_i64_after(args, "--window-id"))
        else {
            return usage();
        };
        return effects(vec![HostEffect::OpenUrlIntoGroup {
            url,
            window_id,
            group_id,
        }]);
    }
    if let Some(window_id) = into_window {
        return effects(vec![HostEffect::OpenUrlIntoWindow { url, window_id }]);
    }
    if new_window {
        return effects(vec![HostEffect::OpenUrlNewWindow { url }]);
    }
    effects(vec![HostEffect::OpenUrlNewTab { url }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn into_window_emits_effect() {
        let bundle = run(&[
            "open".into(),
            "--into-window".into(),
            "3".into(),
            "https://example.com".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::OpenUrlIntoWindow { url, window_id } => {
                    assert_eq!(url, "https://example.com");
                    assert_eq!(*window_id, 3);
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn into_group_requires_window_id() {
        let bundle = run(&[
            "open".into(),
            "--into-group".into(),
            "9".into(),
            "--window-id".into(),
            "2".into(),
            "https://example.com".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::OpenUrlIntoGroup {
                    url,
                    window_id,
                    group_id,
                } => {
                    assert_eq!(url, "https://example.com");
                    assert_eq!(*window_id, 2);
                    assert_eq!(*group_id, 9);
                }
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }
}
