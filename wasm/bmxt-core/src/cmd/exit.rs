use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "exit",
    aliases: &[],
    usage_primary: "exit",
    man: &[
        "NAME",
        "  exit - close the BMXt window and clear the session log",
        "",
        "SYNOPSIS",
        "  exit",
        "",
        "NOTE",
        "  Does not clear command history (up/down or Ctrl+R). Same as clear for history.",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ExitBmxt])
}
