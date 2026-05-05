//! 全組み込みコマンドのメタデータ一覧。新規コマンドは `crate::cmd::*::CMD` をここに 1 行追加する。

use crate::cmd::{
    clear, close, exit, group, help_cmd, tabs,
};
use crate::meta::Cmd;

pub static COMMANDS: &[Cmd] = &[
    clear::CMD,
    close::CMD,
    exit::CMD,
    group::CMD,
    help_cmd::CMD,
    tabs::CMD,
];
