use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, Msg, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.sync.usage.line0",
    "cmd.sync.usage.line1",
    "cmd.sync.usage.line2",
    "cmd.sync.usage.line3",
    "cmd.sync.usage.line4",
    "cmd.sync.usage.line5",
    "cmd.sync.usage.line6",
    "cmd.sync.usage.line7",
    "cmd.sync.usage.line8",
];

const MAX_INVITE_LEN: usize = 8192;
const MAX_RTC_CODE_LEN: usize = 48_000;
const MAX_DEVICE_ID_LEN: usize = 64;
const MAX_OPEN_PAYLOAD_LEN: usize = 8192;

fn compact_token(raw: &str) -> String {
    raw.chars().filter(|c| !c.is_whitespace()).collect()
}

fn usage_bundle(extra: Vec<Msg>) -> DispatchBundle {
    let mut msgs_vec = extra;
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs_vec.push(msg_key("cmd.sync.runHint"));
    msgs(msgs_vec)
}

fn rest_join(args: &[String], from: usize) -> String {
    args.iter()
        .skip(from)
        .cloned()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn sanitize_device_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_DEVICE_ID_LEN {
        return None;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn sanitize_rtc_code(raw: &str) -> Option<String> {
    let compact = compact_token(raw);
    if compact.len() < 16 || compact.len() > MAX_RTC_CODE_LEN {
        return None;
    }
    if !compact.starts_with("bmxt-rtc1.") {
        return None;
    }
    Some(compact)
}

fn sanitize_invite(raw: &str) -> Option<String> {
    let compact = compact_token(raw);
    if compact.is_empty() {
        return Some(String::new());
    }
    if compact.len() > MAX_INVITE_LEN {
        return None;
    }
    Some(compact)
}

pub fn run(args: &[String]) -> DispatchBundle {
    let sub = match helpers::require_second_token("sync", args, USAGE_KEYS) {
        Ok(s) => s,
        Err(bundle) => return bundle,
    };

    match sub.as_str() {
        "-setup" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.sync.error.tooManyArgs")]);
            }
            ui(UiAction::SyncSetup)
        }
        "-status" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.sync.error.tooManyArgs")]);
            }
            ui(UiAction::SyncStatus)
        }
        "-pair" => {
            let invite = match sanitize_invite(&rest_join(args, 2)) {
                Some(v) => v,
                None => {
                    return usage_bundle(vec![msg_key("cmd.sync.error.inviteTooLong")]);
                }
            };
            ui(UiAction::SyncPair { invite })
        }
        "-members" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.sync.error.tooManyArgs")]);
            }
            ui(UiAction::SyncMembers)
        }
        "-offer" => {
            if args.len() > 2 {
                return usage_bundle(vec![msg_key("cmd.sync.error.tooManyArgs")]);
            }
            ui(UiAction::SyncOffer)
        }
        "-answer" => {
            let code = match sanitize_rtc_code(&rest_join(args, 2)) {
                Some(c) => c,
                None => {
                    return usage_bundle(vec![msg_key("cmd.sync.error.invalidRtcCode")]);
                }
            };
            ui(UiAction::SyncAnswer { code })
        }
        "-accept" => {
            let code = match sanitize_rtc_code(&rest_join(args, 2)) {
                Some(c) => c,
                None => {
                    return usage_bundle(vec![msg_key("cmd.sync.error.invalidRtcCode")]);
                }
            };
            ui(UiAction::SyncAccept { code })
        }
        "-open" => {
            if args.len() < 4 {
                return usage_bundle(vec![msg_key("cmd.sync.error.openUsage")]);
            }
            let device_id = match sanitize_device_id(&args[2]) {
                Some(id) => id,
                None => {
                    return usage_bundle(vec![msg_key("cmd.sync.error.invalidDeviceId")]);
                }
            };
            let payload = rest_join(args, 3);
            if payload.is_empty() || payload.len() > MAX_OPEN_PAYLOAD_LEN {
                return usage_bundle(vec![msg_key("cmd.sync.error.openUsage")]);
            }
            ui(UiAction::SyncOpen {
                device_id,
                payload,
            })
        }
        "-ping" => {
            let raw = rest_join(args, 2);
            let device_id = match sanitize_device_id(&raw) {
                Some(id) => id,
                None => {
                    return usage_bundle(vec![msg_key("cmd.sync.error.invalidDeviceId")]);
                }
            };
            ui(UiAction::SyncPing { device_id })
        }
        _ => {
            let option = args.get(1).map(|s| s.as_str()).unwrap_or("");
            usage_bundle(vec![msg_param(
                "cmd.sync.error.unknownOption",
                "option",
                option,
            )])
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn status_emits_ui() {
        let bundle = run(&["sync".to_string(), "-status".to_string()]);
        match bundle {
            DispatchBundle::Ui { action, .. } => {
                assert!(matches!(action, UiAction::SyncStatus));
            }
            other => panic!("expected ui, got {other:?}"),
        }
    }

    #[test]
    fn lone_sync_prompts() {
        let bundle = run(&["sync".to_string()]);
        match bundle {
            DispatchBundle::Msgs { prompt_prefix, .. } => {
                assert_eq!(prompt_prefix.as_deref(), Some("sync "));
            }
            other => panic!("expected msgs, got {other:?}"),
        }
    }

    #[test]
    fn sanitize_device_id_rejects_spaces() {
        assert!(sanitize_device_id("bad id").is_none());
        assert!(sanitize_device_id("abc-DEF_12").is_some());
    }

    #[test]
    fn sanitize_rtc_code_requires_prefix() {
        assert!(sanitize_rtc_code("nope").is_none());
        assert!(sanitize_rtc_code("bmxt-rtc1.abcdef0123456789").is_some());
    }

    #[test]
    fn sanitize_rtc_code_strips_whitespace() {
        let code = "bmxt-rtc1.abcdef\n 0123456789";
        assert_eq!(
            sanitize_rtc_code(code).as_deref(),
            Some("bmxt-rtc1.abcdef0123456789")
        );
    }

    #[test]
    fn setup_emits_ui() {
        let bundle = run(&["sync".to_string(), "-setup".to_string()]);
        match bundle {
            DispatchBundle::Ui { action, .. } => {
                assert!(matches!(action, UiAction::SyncSetup));
            }
            other => panic!("expected ui, got {other:?}"),
        }
    }
}
