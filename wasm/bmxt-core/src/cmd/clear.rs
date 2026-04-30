use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "clear",
    aliases: &[],
    usage_primary: "clear",
    man: &[
        "NAME",
        "  clear - clear the on-screen session log",
        "",
        "SYNOPSIS",
        "  clear",
        "",
        "NOTE",
        "  Does not clear command history (up/down or Ctrl+R).",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ClearLog])
}
