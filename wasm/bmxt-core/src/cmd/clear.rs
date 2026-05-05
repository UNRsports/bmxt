use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "clear",
    aliases: &[],
    usage_primary: "clear",
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ClearLog])
}
