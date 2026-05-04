use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "split-col",
    aliases: &[],
    usage_primary: "split-col",
    man: &[
        "NAME",
        "  split-col - split the current pane (new pane to the right)",
        "",
        "SYNOPSIS",
        "  split-col",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::SplitCol])
}
