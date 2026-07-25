use crate::ir::{effects, msgs, ui, ChromeEffect, DispatchBundle, Msg, UiAction};

pub fn run(args: &[String]) -> DispatchBundle {
    if args.iter().any(|a| a == "--confirmed") {
        return effects(vec![ChromeEffect::CloseCurrentTab]);
    }

    if args.len() <= 1 {
        return ui(UiAction::NavConfirmClose {
            target: "tab".to_string(),
        });
    }

    let id_str = args.get(1).map(String::as_str).unwrap_or("");
    let id = id_str.parse::<i64>();
    match id {
        Ok(tab_id) if tab_id >= 0 => effects(vec![ChromeEffect::CloseTab { tab_id }]),
        _ => msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]),
    }
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
            } => assert_eq!(target, "tab"),
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn confirmed_emits_close_current() {
        let bundle = run(&["close".into(), "--confirmed".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => {
                assert!(matches!(effects[0], ChromeEffect::CloseCurrentTab));
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn numeric_id_emits_close_tab() {
        let bundle = run(&["close".into(), "42".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::CloseTab { tab_id } => assert_eq!(*tab_id, 42),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
