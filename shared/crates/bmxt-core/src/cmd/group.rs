use crate::ir::{effects, msgs, ui, HostEffect, DispatchBundle, Msg, UiAction};

const GROUP_COLORS: &[&str] = &[
    "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
];

pub fn run(args: &[String]) -> DispatchBundle {
    let second = args
        .get(1)
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    if second == "new" {
        return run_group_new(args);
    }

    if second == "add" {
        let group_id = args
            .get(2)
            .and_then(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0);
        let Some(gid) = group_id else {
            return usage();
        };
        let tab_ids: Vec<i64> = args
            .iter()
            .skip(3)
            .filter_map(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0)
            .collect();
        if tab_ids.is_empty() {
            return usage();
        }
        return effects(vec![HostEffect::GroupAdd {
            group_id: gid,
            tab_ids,
        }]);
    }

    if second == "rename" {
        let group_id = args
            .get(2)
            .and_then(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0);
        let Some(gid) = group_id else {
            return usage();
        };
        let title = args.get(3).cloned().unwrap_or_default();
        if args.len() > 4 {
            return usage();
        }
        return effects(vec![HostEffect::GroupRename {
            group_id: gid,
            title,
        }]);
    }

    if second == "ungroup" {
        let group_id = args
            .get(2)
            .and_then(|s| s.parse::<i64>().ok())
            .filter(|n| *n >= 0);
        let Some(gid) = group_id else {
            return usage();
        };
        if args.len() > 3 {
            return usage();
        }
        return effects(vec![HostEffect::GroupUngroup { group_id: gid }]);
    }

    usage()
}

fn usage() -> DispatchBundle {
    msgs(vec![Msg {
        key: "cmd.group.usage.line".to_string(),
        params: None,
    }])
}

fn run_group_new(args: &[String]) -> DispatchBundle {
    let mut tab_ids: Vec<i64> = Vec::new();
    let mut title = String::new();
    let mut color = String::new();
    let mut i = 2usize;
    while i < args.len() {
        let tok = args[i].as_str();
        if tok == "--title" {
            let Some(value) = args.get(i + 1) else {
                return usage();
            };
            title = value.clone();
            i += 2;
            continue;
        }
        if tok == "--color" {
            let Some(value) = args.get(i + 1) else {
                return usage();
            };
            let normalized = value.to_ascii_lowercase();
            if !GROUP_COLORS.iter().any(|c| *c == normalized) {
                return usage();
            }
            color = normalized;
            i += 2;
            continue;
        }
        if tok.starts_with('-') {
            return usage();
        }
        match tok.parse::<i64>() {
            Ok(id) if id >= 0 => {
                if !tab_ids.contains(&id) {
                    tab_ids.push(id);
                }
            }
            _ => return usage(),
        }
        i += 1;
    }
    if tab_ids.is_empty() {
        return ui(UiAction::GroupNewFromSelection);
    }
    effects(vec![HostEffect::GroupNew {
        tab_ids,
        title,
        color,
    }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_with_title_and_color() {
        let bundle = run(&[
            "group".into(),
            "new".into(),
            "1".into(),
            "2".into(),
            "--title".into(),
            "Work".into(),
            "--color".into(),
            "blue".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::GroupNew {
                    tab_ids,
                    title,
                    color,
                } => {
                    assert_eq!(tab_ids, &vec![1, 2]);
                    assert_eq!(title, "Work");
                    assert_eq!(color, "blue");
                }
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn rename_emits_effect() {
        let bundle = run(&[
            "group".into(),
            "rename".into(),
            "5".into(),
            "Alpha".into(),
        ]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::GroupRename { group_id, title } => {
                    assert_eq!(*group_id, 5);
                    assert_eq!(title, "Alpha");
                }
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn ungroup_emits_effect() {
        let bundle = run(&["group".into(), "ungroup".into(), "8".into()]);
        match bundle {
            DispatchBundle::Effects { effects, .. } => match &effects[0] {
                HostEffect::GroupUngroup { group_id } => assert_eq!(*group_id, 8),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
