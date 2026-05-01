use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "forward",
    aliases: &["fwd"],
    usage_primary: "forward [tabId]",
    man: &[
        "NAME",
        "  forward, fwd - navigate the tab history forward",
        "",
        "SYNOPSIS",
        "  forward [tabId]",
        "  fwd [tabId]",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let tab_arg = args.get(1).cloned();
    DispatchJson::effects(vec![Effect::GoForward { tab_id_arg: tab_arg }])
}
