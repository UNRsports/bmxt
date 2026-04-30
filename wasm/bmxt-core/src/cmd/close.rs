use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "close",
    aliases: &["c"],
    usage_primary: "close <tabId>",
    man: &[
        "NAME",
        "  close, c - close a tab",
        "",
        "SYNOPSIS",
        "  close <tabId>",
        "  c <tabId>",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let Some(id) = args.get(1).and_then(|s| s.parse::<i32>().ok()) else {
        return DispatchJson::lines(vec!["usage: close <tabId>".to_string()]);
    };
    DispatchJson::effects(vec![Effect::CloseTab { tab_id: id }])
}
