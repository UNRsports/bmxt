use crate::ir::{effects, msgs, ui, HostEffect, DispatchBundle, Msg, UiAction};

pub fn run(args: &[String]) -> DispatchBundle {
    if args.iter().any(|a| a == "--confirmed") {
        return effects(vec![HostEffect::CloseCurrentTab]);
    }

    if let Some(bundle) = try_close_windows(args) {
        return bundle;
    }
    if let Some(bundle) = try_close_group(args) {
        return bundle;
    }

    if args.len() <= 1 {
        return ui(UiAction::NavConfirmClose {
            target: "tab".to_string(),
        });
    }

    let id_str = args.get(1).map(String::as_str).unwrap_or("");
    if id_str.starts_with('-') {
        return msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]);
    }
    let id = id_str.parse::<i64>();
    match id {
        Ok(tab_id) if tab_id >= 0 => effects(vec![HostEffect::CloseTab { tab_id }]),
        _ => msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]),
    }
}

fn try_close_windows(args: &[String]) -> Option<DispatchBundle> {
    let mut i = 1usize;
    let mut found = false;
    let mut window_ids: Vec<i64> = Vec::new();
    while i < args.len() {
        if args[i] == "--window" {
            found = true;
            i += 1;
            while i < args.len() {
                let tok = args[i].as_str();
                if tok.starts_with('-') {
                    break;
                }
                match tok.parse::<i64>() {
                    Ok(id) if id >= 0 => {
                        if !window_ids.contains(&id) {
                            window_ids.push(id);
                        }
                    }
                    _ => {
                        return Some(msgs(vec![Msg {
                            key: "cmd.close.usage".to_string(),
                            params: None,
                        }]));
                    }
                }
                i += 1;
            }
            continue;
        }
        if args[i] == "--group" {
            // EN: Mixed --window/--group on one line is misuse.
            if found {
                return Some(msgs(vec![Msg {
                    key: "cmd.close.usage".to_string(),
                    params: None,
                }]));
            }
            return None;
        }
        if found {
            return Some(msgs(vec![Msg {
                key: "cmd.close.usage".to_string(),
                params: None,
            }]));
        }
        i += 1;
    }
    if !found {
        return None;
    }
    if window_ids.is_empty() {
        return Some(msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]));
    }
    Some(effects(vec![HostEffect::CloseWindow { window_ids }]))
}

fn try_close_group(args: &[String]) -> Option<DispatchBundle> {
    let mut i = 1usize;
    while i < args.len() {
        if args[i] == "--group" {
            let id_str = args.get(i + 1).map(String::as_str).unwrap_or("");
            let Ok(group_id) = id_str.parse::<i64>() else {
                return Some(msgs(vec![Msg {
                    key: "cmd.close.usage".to_string(),
                    params: None,
                }]));
            };
            if group_id < 0 {
                return Some(msgs(vec![Msg {
                    key: "cmd.close.usage".to_string(),
                    params: None,
                }]));
            }
            if args.len() != i + 2 {
                return Some(msgs(vec![Msg {
                    key: "cmd.close.usage".to_string(),
                    params: None,
                }]));
            }
            return Some(effects(vec![HostEffect::CloseGroup { group_id }]));
        }
        i += 1;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn bare_emits_confirm_ui() {
        let bundle = run(&["close".into()]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::NavConfirmClose { target },
                ..
            } => assert_eq!(target, "tab"),
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn confirmed_emits_close_current() {
        let bundle = run(&["close".into(), "--confirmed".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => {
                assert!(matches!(effects[0], HostEffect::CloseCurrentTab));
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn numeric_id_emits_close_tab() {
        let bundle = run(&["close".into(), "42".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::CloseTab { tab_id } => assert_eq!(*tab_id, 42),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn window_flag_emits_close_window() {
        let bundle = run(&[
            "close".into(),
            "--window".into(),
            "3".into(),
            "7".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::CloseWindow { window_ids } => {
                    assert_eq!(window_ids, &vec![3, 7]);
                }
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn group_flag_emits_close_group() {
        let bundle = run(&["close".into(), "--group".into(), "9".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::CloseGroup { group_id } => assert_eq!(*group_id, 9),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
