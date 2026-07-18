use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{effects, msg_key, msg_param, msgs, ui, ChromeEffect, DispatchBundle, Msg, UiAction};

pub const MAX_SESSION_NAME_LEN: usize = 64;

const USAGE_KEYS: &[&str] = &[
    "cmd.session.usage.line1",
    "cmd.session.usage.line2",
    "cmd.session.usage.line3",
    "cmd.session.usage.line4",
    "cmd.session.usage.line5",
    "cmd.session.usage.line6",
    "cmd.session.usage.line7",
    "cmd.session.usage.line8",
    "cmd.session.usage.line9",
];

fn usage_bundle(extra: Vec<Msg>) -> DispatchBundle {
    let mut msgs_vec = extra;
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs_vec.push(msg_key("cmd.session.runHint"));
    msgs(msgs_vec)
}

pub fn sanitize_session_name(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_SESSION_NAME_LEN {
        return None;
    }
    if trimmed
        .chars()
        .any(|c| c == '\r' || c == '\n' || c == '\t' || c == '\u{007f}' || (c <= '\u{001f}'))
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn raw_name(args: &[String]) -> String {
    args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ").trim().to_string()
}

pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        let mut msgs_vec = vec![msg_param("cmd.common.availableOptions", "command", "session")];
        for key in USAGE_KEYS {
            msgs_vec.push(msg_key(key));
        }
        msgs_vec.push(msg_key("cmd.session.runHint"));
        return msgs(msgs_vec);
    }

    let sub = normalize_token(&args[1]);
    if !helpers::normalize_token(&args[1]).is_empty()
        && !crate::generated::is_second_token("session", &args[1])
    {
        return usage_bundle(vec![msg_param(
            "cmd.session.error.unknownOption",
            "option",
            &args[1],
        )]);
    }

    match sub.as_str() {
        "-new" => {
            let raw = raw_name(args);
            if raw.len() > MAX_SESSION_NAME_LEN {
                return usage_bundle(vec![msg_param(
                    "cmd.session.error.nameTooLong",
                    "max",
                    &MAX_SESSION_NAME_LEN.to_string(),
                )]);
            }
            if !raw.is_empty() && sanitize_session_name(&raw).is_none() {
                return usage_bundle(vec![msg_key("cmd.session.error.invalidName")]);
            }
            effects(vec![ChromeEffect::SessionNew { name: raw }])
        }
        "-setting-name" | "-switch" => {
            let raw = raw_name(args);
            if raw.len() > MAX_SESSION_NAME_LEN {
                return usage_bundle(vec![msg_param(
                    "cmd.session.error.nameTooLong",
                    "max",
                    &MAX_SESSION_NAME_LEN.to_string(),
                )]);
            }
            if !raw.is_empty() && sanitize_session_name(&raw).is_none() {
                return usage_bundle(vec![msg_key("cmd.session.error.invalidName")]);
            }
            if sub == "-setting-name" {
                ui(UiAction::SessionSettingName { name: raw })
            } else {
                ui(UiAction::SessionSwitch { name: raw })
            }
        }
        "-next" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.session.error.tooManyArgs")]);
            }
            effects(vec![ChromeEffect::SessionNext])
        }
        "-prev" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.session.error.tooManyArgs")]);
            }
            effects(vec![ChromeEffect::SessionPrev])
        }
        "-list" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.session.error.tooManyArgs")]);
            }
            ui(UiAction::SessionList)
        }
        _ => usage_bundle(vec![msg_key("cmd.session.error.internal")]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_rejects_control_chars() {
        assert_eq!(sanitize_session_name("foo\nbar"), None);
    }

    #[test]
    fn sanitize_accepts_valid_name() {
        assert_eq!(sanitize_session_name("  my session  "), Some("my session".to_string()));
    }
}
