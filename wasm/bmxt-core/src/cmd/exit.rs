use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "exit",
    aliases: &[],
    usage_primary: "exit",
    man: &[
        "NAME",
        "  exit - close the BMXt window",
        "",
        "SYNOPSIS",
        "  exit",
        "",
        "NOTE",
        "  Closes the window and clears the session log.",
        "  Does not clear command history (up/down or Ctrl+R).",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ExitPane])
}
