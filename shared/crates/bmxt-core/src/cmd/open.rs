use crate::ir::{effects, msg_key, msgs, HostEffect, DispatchBundle};
use crate::line_parse::parse_http_url_candidate;

const USAGE_KEYS: &[&str] = &[
    "cmd.open.usage.line1",
    "cmd.open.usage.line2",
    "cmd.open.usage.line3",
    "cmd.open.usage.line4",
];

fn usage() -> DispatchBundle {
    msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
}

/// EN: Bare `open` prints usage. `open <url>` / `open --window <url>` open via HostEffect.
///     Batch open is `<list> | open` (host pipe consumer).
pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return usage();
    }

    let mut window = false;
    let mut url_arg: Option<&str> = None;
    let mut i = 1;
    while i < args.len() {
        let token = args[i].as_str();
        if token == "--window" {
            window = true;
            i += 1;
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

    if window {
        return effects(vec![HostEffect::OpenUrlNewWindow { url }]);
    }
    effects(vec![HostEffect::OpenUrlNewTab { url }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_prints_usage() {
        let bundle = run(&["open".into()]);
        match bundle {
            DispatchBundle::Msgs { msgs, .. } => {
                assert!(!msgs.is_empty());
            }
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn url_opens_new_tab() {
        let bundle = run(&["open".into(), "https://example.com".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                HostEffect::OpenUrlNewTab { url } => assert_eq!(url, "https://example.com"),
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn window_flag_opens_new_window() {
        let bundle = run(&[
            "open".into(),
            "--window".into(),
            "https://example.com".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                HostEffect::OpenUrlNewWindow { url } => assert_eq!(url, "https://example.com"),
                other => panic!("unexpected: {other:?}"),
            },
            other => panic!("unexpected: {other:?}"),
        }
    }
}
