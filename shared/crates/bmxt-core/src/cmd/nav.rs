use crate::cmd::helpers;
use crate::ir::{effects, msg_key, msg_param, msgs, ui, ChromeEffect, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.nav.usage.line1",
    "cmd.nav.usage.line2",
    "cmd.nav.usage.line3",
    "cmd.nav.usage.altToggle",
    "cmd.nav.usage.navTyping",
    "cmd.nav.usage.controls",
];

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("nav", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-enter" => ui(UiAction::NavArm),
        "-exit" => ui(UiAction::NavDisarm),
        "-windowclose" => {
            if args.iter().any(|a| a == "--confirmed") {
                effects(vec![ChromeEffect::CloseCurrentWindow])
            } else {
                ui(UiAction::NavConfirmClose {
                    target: "window".to_string(),
                })
            }
        }
        _ => {
            let option = args.get(1).map(String::as_str).unwrap_or("");
            let mut msgs_vec = vec![msg_param("cmd.nav.error.internal", "option", option)];
            for key in USAGE_KEYS {
                msgs_vec.push(msg_key(key));
            }
            msgs(msgs_vec)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn windowclose_emits_confirm_ui() {
        let bundle = run(&["nav".into(), "-windowclose".into()]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::NavConfirmClose { target },
            } => assert_eq!(target, "window"),
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn windowclose_confirmed_emits_effect() {
        let bundle = run(&[
            "nav".into(),
            "-windowclose".into(),
            "--confirmed".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects } => {
                assert_eq!(effects.len(), 1);
                assert!(matches!(effects[0], ChromeEffect::CloseCurrentWindow));
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
