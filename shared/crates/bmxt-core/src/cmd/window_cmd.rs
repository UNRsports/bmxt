use crate::ir::{msgs, ui, DispatchBundle, Msg, UiAction};

/// EN: `window rename <windowId> <name>` — display name in extension storage.
pub fn run(args: &[String]) -> DispatchBundle {
    let second = args
        .get(1)
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    if second != "rename" {
        return usage();
    }
    let window_id = args
        .get(2)
        .and_then(|s| s.parse::<i64>().ok())
        .filter(|n| *n >= 0);
    let Some(wid) = window_id else {
        return usage();
    };
    let name = args.get(3).cloned().unwrap_or_default();
    if args.len() > 4 {
        return usage();
    }
    ui(UiAction::WindowRename {
        window_id: wid,
        name,
    })
}

fn usage() -> DispatchBundle {
    msgs(vec![Msg {
        key: "cmd.window.usage.line".to_string(),
        params: None,
    }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rename_emits_ui() {
        let bundle = run(&[
            "window".into(),
            "rename".into(),
            "12".into(),
            "Main".into(),
        ]);
        match bundle {
            DispatchBundle::Ui {
                action: UiAction::WindowRename { window_id, name },
                ..
            } => {
                assert_eq!(window_id, 12);
                assert_eq!(name, "Main");
            }
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
