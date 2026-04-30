//! `man` のレジストリ行。実行ロジックは `dispatch` が `registry::api` に委譲する。

use crate::meta::Cmd;

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
