use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "notes",
    aliases: &[],
    usage_primary: "notes",
};

pub fn run(args: &[String]) -> DispatchJson {
    match args.len() {
        0 | 1 => DispatchJson::effects(vec![Effect::ReleaseNotesCurrent]),
        2 => {
            let a = args[1].as_str();
            if a == "--list" || a.eq_ignore_ascii_case("-l") {
                return DispatchJson::effects(vec![Effect::ReleaseNotesList]);
            }
            if a.starts_with('-') {
                return usage();
            }
            let version = args[1].clone();
            DispatchJson::effects(vec![Effect::ReleaseNotesVersion { version }])
        }
        _ => usage(),
    }
}

fn usage() -> DispatchJson {
    DispatchJson::lines(vec![
        "usage: notes              — release notes for the current extension version".to_string(),
        "       notes <version>    — notes for that version key (e.g. 0.0.8)".to_string(),
        "       notes --list | -l  — list versions that have entries".to_string(),
    ])
}
