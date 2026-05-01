use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "activate",
    aliases: &["a"],
    usage_primary: "activate <tabId>",
    man: &[
        "NAME",
        "  activate, a - focus a tab and its window",
        "",
        "SYNOPSIS",
        "  activate <tabId>",
        "  a <tabId>",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let Some(id) = args.get(1).and_then(|s| s.parse::<i32>().ok()) else {
        return DispatchJson::lines(vec!["usage: activate <tabId>".to_string()]);
    };
    DispatchJson::effects(vec![Effect::Activate { tab_id: id }])
}
