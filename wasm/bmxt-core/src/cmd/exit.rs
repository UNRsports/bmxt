use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "exit",
    aliases: &[],
    usage_primary: "exit",
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::effects(vec![Effect::ExitPane])
}
