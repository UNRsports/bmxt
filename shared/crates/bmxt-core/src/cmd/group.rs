use crate::ir::{effects, msgs, ui, HostEffect, DispatchBundle, Msg, UiAction};

pub fn run(args: &[String]) -> DispatchBundle {
    let second = args
        .get(1)
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    if second == "new" {
        let tab_ids: Vec<i64> = args
            .iter()
            .skip(2)
            .filter_map(|s| s.parse::<i64>().ok())
            .collect();
        if tab_ids.is_empty() {
            return ui(UiAction::GroupNewFromSelection);
        }
        return effects(vec![HostEffect::GroupNew { tab_ids }]);
    }

    if second == "add" {
        let group_id = args
            .get(2)
            .and_then(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0);
        let Some(gid) = group_id else {
            return msgs(vec![Msg {
                key: "cmd.group.usage.line".to_string(),
                params: None,
            }]);
        };
        let tab_ids: Vec<i64> = args
            .iter()
            .skip(3)
            .filter_map(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0)
            .collect();
        if tab_ids.is_empty() {
            return msgs(vec![Msg {
                key: "cmd.group.usage.line".to_string(),
                params: None,
            }]);
        }
        return effects(vec![HostEffect::GroupAdd {
            group_id: gid,
            tab_ids,
        }]);
    }

    msgs(vec![Msg {
        key: "cmd.group.usage.line".to_string(),
        params: None,
    }])
}
