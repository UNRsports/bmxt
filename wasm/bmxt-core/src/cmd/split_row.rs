use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "split-row",
    aliases: &[],
    usage_primary: "split-row",
};

pub fn run(args: &[String]) -> DispatchJson {
    if args.len() > 1 {
        return DispatchJson::lines(vec!["error: split-row takes no arguments".to_string()]);
    }
    DispatchJson::effects(vec![Effect::SplitRow])
}
