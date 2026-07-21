use crate::cmd::helpers;
use crate::ir::{
    effects, msg_key, msg_param, msgs, ui, ChromeEffect, DispatchBundle, UiAction,
};

const USAGE_KEYS: &[&str] = &[
    "cmd.nav.usage.line1",
    "cmd.nav.usage.line2",
    "cmd.nav.usage.line3",
    "cmd.nav.usage.line4",
    "cmd.nav.usage.altToggle",
    "cmd.nav.usage.navTyping",
    "cmd.nav.usage.controls",
];

fn parse_reload_tab_ids(args: &[String]) -> Result<Vec<i64>, DispatchBundle> {
    let mut ids = Vec::new();
    for raw in args.iter().skip(2) {
        let tok = raw.trim();
        if tok.is_empty() {
            continue;
        }
        let Some(id_str) = tok.strip_prefix("#t:") else {
            return Err(msgs(vec![
                msg_param("cmd.nav.error.badReloadToken", "token", tok),
                msg_key("cmd.nav.usage.line3"),
            ]));
        };
        match id_str.parse::<i64>() {
            Ok(id) if id >= 0 => {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            _ => {
                return Err(msgs(vec![
                    msg_param("cmd.nav.error.badReloadToken", "token", tok),
                    msg_key("cmd.nav.usage.line3"),
                ]));
            }
        }
    }
    Ok(ids)
}

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("nav", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    match first_lc.as_str() {
        "-enter" => ui(UiAction::NavArm),
        "-exit" => ui(UiAction::NavDisarm),
        "-back" => effects(vec![ChromeEffect::TabGoBack]),
        "-forward" => effects(vec![ChromeEffect::TabGoForward]),
        "-reload" => match parse_reload_tab_ids(args) {
            Ok(tab_ids) => effects(vec![ChromeEffect::TabReload { tab_ids }]),
            Err(bundle) => bundle,
        },
        "-close" => {
            if args.iter().any(|a| a == "--confirmed") {
                effects(vec![ChromeEffect::CloseCurrentTab])
            } else {
                ui(UiAction::NavConfirmClose {
                    target: "tab".to_string(),
                })
            }
        }
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
    fn reload_empty_emits_empty_tab_ids() {
        let bundle = run(&["nav".into(), "-reload".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => {
                assert_eq!(effects.len(), 1);
                match &effects[0] {
                    ChromeEffect::TabReload { tab_ids } => assert!(tab_ids.is_empty()),
                    other => panic!("unexpected effect: {other:?}"),
                }
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn reload_parses_tab_tokens() {
        let bundle = run(&[
            "nav".into(),
            "-reload".into(),
            "#t:12".into(),
            "#t:34".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabReload { tab_ids } => assert_eq!(tab_ids, &vec![12, 34]),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn close_emits_confirm_ui() {
        let bundle = run(&["nav".into(), "-close".into()]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::NavConfirmClose { target },
            } => assert_eq!(target, "tab"),
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
