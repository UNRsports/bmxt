use crate::ir::DispatchBundle;

pub mod aboutbmxt;
pub mod browse;
pub mod clear;
pub mod close;
pub mod dom;
pub mod exit;
pub mod group;
pub mod help_cmd;
pub mod nav;
pub mod search;
pub mod session;
pub mod setting;
pub mod snapshot;
pub mod tabs;
pub mod translate;

mod helpers;

pub fn run_command(canonical: &str, args: &[String]) -> DispatchBundle {
    if let Some(bundle) = help_cmd::try_section_help(canonical, args) {
        return bundle;
    }
    match canonical {
        "clear" => clear::run(args),
        "close" => close::run(args),
        "dom" => dom::run(args),
        "exit" => exit::run(args),
        "search" => search::run(args),
        "group" => group::run(args),
        "help" => help_cmd::run(args),
        "tabs" => tabs::run(args),
        "nav" => nav::run(args),
        "translate" => translate::run(args),
        "aboutbmxt" => aboutbmxt::run(args),
        "session" => session::run(args),
        "snapshot" => snapshot::run(args),
        "browse" => browse::run(args),
        "setting" => setting::run(args),
        _ => crate::ir::msgs(vec![crate::ir::msg_param(
            "cmd.error.internalUnhandled",
            "command",
            canonical,
        )]),
    }
}

pub fn all_completion_tokens() -> Vec<String> {
    let mut tokens = Vec::new();
    for meta in crate::generated::all_command_metas() {
        tokens.push(meta.name.to_string());
        for alias in meta.aliases {
            tokens.push((*alias).to_string());
        }
    }
    tokens.sort();
    tokens.dedup();
    tokens
}
