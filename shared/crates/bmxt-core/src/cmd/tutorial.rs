//! EN: Interactive onboarding coach (`tutorial` / `tutorial -start` / `tutorial -skip`).
//! JA: 対話チュートリアル（`set_mode` feature_id=tutorial を再利用）。

use crate::cmd::helpers::{self, normalize_token};
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.tutorial.usage.line1",
    "cmd.tutorial.usage.line2",
    "cmd.tutorial.usage.detail",
];

fn usage_msgs(extra: crate::ir::Msg) -> DispatchBundle {
    let mut msgs_vec = vec![extra];
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs(msgs_vec)
}

fn start_bundle() -> DispatchBundle {
    ui(UiAction::SetMode {
        feature_id: "tutorial".to_string(),
        mode: "start".to_string(),
    })
}

fn skip_bundle() -> DispatchBundle {
    ui(UiAction::SetMode {
        feature_id: "tutorial".to_string(),
        mode: "skip".to_string(),
    })
}

pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return start_bundle();
    }

    let first_lc = normalize_token(&args[1]);
    match first_lc.as_str() {
        "-start" => start_bundle(),
        "-skip" => skip_bundle(),
        "help" => {
            // EN: `tutorial help` is handled by try_section_help before run; keep fallback.
            msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect())
        }
        _ => {
            if helpers::normalize_token(&args[1]).is_empty() {
                return start_bundle();
            }
            usage_msgs(msg_param(
                "cmd.tutorial.error.unknownOption",
                "option",
                args.get(1).map(String::as_str).unwrap_or(""),
            ))
        }
    }
}
