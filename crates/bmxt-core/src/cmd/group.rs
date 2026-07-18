use crate::ir::{effects, msgs, ui, ChromeEffect, DispatchBundle, Msg, UiAction};

pub fn run(args: &[String]) -> DispatchBundle {
    if args.get(1).map(|s| s.to_ascii_lowercase()).as_deref() != Some("new") {
        return msgs(vec![Msg {
            key: "cmd.group.usage.line".to_string(),
            params: None,
        }]);
    }
    let tab_ids: Vec<i64> = args
        .iter()
        .skip(2)
        .filter_map(|s| s.parse::<i64>().ok())
        .collect();
    if tab_ids.is_empty() {
        return ui(UiAction::GroupNewFromSelection);
    }
    effects(vec![ChromeEffect::GroupNew { tab_ids }])
}
