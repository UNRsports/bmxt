//! `help` のレジストリ行。実行ロジックは `dispatch` が `registry::api::build_help_lines` に委譲する。

use crate::meta::Cmd;

pub const CMD: Cmd = Cmd {
    name: "help",
    aliases: &["?"],
    usage_primary: "help",
    man: &[
        "NAME",
        "  help, ? - list commands and BMXt window keys",
        "",
        "SYNOPSIS",
        "  help",
        "",
        "SEE ALSO",
        "  man(1) for per-command manuals; man url for typed-URL opening",
    ],
};
