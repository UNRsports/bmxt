use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "split-col",
    aliases: &[],
    usage_primary: "split-col",
};

pub fn run(args: &[String]) -> DispatchJson {
    if args.len() > 1 {
        return DispatchJson::lines(vec!["error: split-col takes no arguments".to_string()]);
    }
    DispatchJson::effects(vec![Effect::SplitCol])
}
