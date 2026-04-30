use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "windows",
    aliases: &["wins"],
    usage_primary: "windows",
    man: &[
        "NAME",
        "  windows, wins - list browser windows",
        "",
        "SYNOPSIS",
        "  windows | wins",
        "",
        "OUTPUT",
        "  One line per window: optional leading * if focused, then the active",
        "  tab title only (no window id or type).",
    ],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ListWindows])
}
