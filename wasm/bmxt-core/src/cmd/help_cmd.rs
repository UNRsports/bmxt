//! `help` のレジストリ行と `run`。

use crate::meta::Cmd;
use crate::model::DispatchJson;
use crate::registry::api;

pub const CMD: Cmd = Cmd {
    name: "help",
    aliases: &["?"],
    usage_primary: "help",
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::lines(api::build_help_lines())
}
