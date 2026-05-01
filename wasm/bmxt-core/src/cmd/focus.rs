use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "focus",
    aliases: &[],
    usage_primary: "focus",
    man: &[
        "NAME",
        "  focus - show last focused window tracking",
        "",
        "SYNOPSIS",
        "  focus",
        "",
        "NOTE",
        "  Used when tab id is omitted for back / forward.",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::FocusInfo])
}
