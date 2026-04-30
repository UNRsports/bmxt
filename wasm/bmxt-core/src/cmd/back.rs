use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "back",
    aliases: &["b"],
    usage_primary: "back [tabId]",
    man: &[
        "NAME",
        "  back, b - navigate the tab history backward",
        "",
        "SYNOPSIS",
        "  back [tabId]",
        "",
        "DESCRIPTION",
        "  If tabId is omitted, uses the active tab in the last focused window",
        "  (with fallbacks; see focus).",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let tab_arg = args.get(1).cloned();
    DispatchJson::effects(vec![Effect::GoBack { tab_id_arg: tab_arg }])
}
