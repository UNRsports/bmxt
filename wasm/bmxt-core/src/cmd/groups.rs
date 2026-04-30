use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "groups",
    aliases: &["gls"],
    usage_primary: "groups",
    man: &["NAME", "  groups, gls - list tab groups", "", "SYNOPSIS", "  groups | gls"],
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ListTabGroups])
}
