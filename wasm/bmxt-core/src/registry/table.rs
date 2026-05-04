//! 全組み込みコマンドのメタデータ一覧。新規コマンドは `crate::cmd::*::CMD` をここに 1 行追加する。

use crate::cmd::{
    activate, back, clear, close, echo, exit, focus, forward, group, groups, help_cmd, man_page,
    move_tab, new_tab, split_col, split_row, tabs, windows,
};
use crate::meta::Cmd;

pub static COMMANDS: &[Cmd] = &[
    activate::CMD,
    back::CMD,
    clear::CMD,
    close::CMD,
    echo::CMD,
    exit::CMD,
    focus::CMD,
    forward::CMD,
    group::CMD,
    groups::CMD,
    help_cmd::CMD,
    man_page::CMD,
    move_tab::CMD,
    new_tab::CMD,
    split_col::CMD,
    split_row::CMD,
    tabs::CMD,
    windows::CMD,
];
