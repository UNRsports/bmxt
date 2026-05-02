//! `man` のレジストリ行と `run`。

use crate::meta::Cmd;
use crate::model::DispatchJson;
use crate::registry::api;

pub const CMD: Cmd = Cmd {
    name: "man",
    aliases: &[],
    usage_primary: "man [topic]",
    man: &[
        "NAME",
        "  man - show manual for a command",
        "",
        "SYNOPSIS",
        "  man [topic]",
        "",
        "DESCRIPTION",
        "  Without topic, prints available manual pages.",
        "  With topic, prints a short reference for that command.",
        "",
        "SEE ALSO",
        "  help",
    ],
};

pub fn run(args: &[String]) -> DispatchJson {
    let topic = args.get(1).map(|s| s.as_str());
    if topic.is_none() || topic == Some("") {
        let topics = api::list_man_topics().join(", ");
        return DispatchJson::lines(vec![
            "USAGE: man <topic>".to_string(),
            String::new(),
            "Available topics:".to_string(),
            format!("  {}", topics),
        ]);
    }
    let topic = topic.unwrap();
    match api::get_man_lines(topic) {
        Some(page) => DispatchJson::lines(page),
        None => DispatchJson::lines(vec![format!(
            "no manual entry for \"{}\". Try: man",
            topic
        )]),
    }
}
