use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "move",
    aliases: &["mv"],
    usage_primary: "move <tabId> <windowId> [index]",
    man: &[
        "NAME",
        "  move, mv - move a tab to another window",
        "",
        "SYNOPSIS",
        "  move <tabId> <windowId> [index]",
        "  mv <tabId> <windowId> [index]",
        "",
        "DESCRIPTION",
        "  index defaults to end of the target window when omitted.",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let tab_id = args.get(1).and_then(|s| s.parse::<i32>().ok());
    let window_id = args.get(2).and_then(|s| s.parse::<i32>().ok());
    if tab_id.is_none() || window_id.is_none() {
        return DispatchJson::lines(vec![
            "usage: move <tabId> <windowId> [index]".to_string(),
            "  index defaults to end of target window".to_string(),
        ]);
    }
    let tab_id = tab_id.unwrap();
    let window_id = window_id.unwrap();
    let index_arg = args.get(3);
    let index = if let Some(s) = index_arg {
        match s.parse::<i32>() {
            Ok(i) => Some(i),
            Err(_) => {
                return DispatchJson::lines(vec!["invalid index".to_string()]);
            }
        }
    } else {
        None
    };
    DispatchJson::effects(vec![Effect::MoveTab {
        tab_id,
        window_id,
        index,
    }])
}
