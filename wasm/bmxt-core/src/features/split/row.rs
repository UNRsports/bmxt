use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "split-row",
    aliases: &[],
    usage_primary: "split-row",
    man: &[
        "NAME",
        "  split-row - split the current pane (new pane below)",
        "",
        "SYNOPSIS",
        "  split-row",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::SplitRow])
}
