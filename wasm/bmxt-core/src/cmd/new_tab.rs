use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "new",
    aliases: &[],
    usage_primary: "new [url]",
    man: &[
        "NAME",
        "  new - open a new tab",
        "",
        "SYNOPSIS",
        "  new [url]",
        "",
        "DESCRIPTION",
        "  If url is omitted, opens the new tab page.",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let url = args.get(1).cloned();
    DispatchJson::effects(vec![Effect::NewTab { url }])
}
