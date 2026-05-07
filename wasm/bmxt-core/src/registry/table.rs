//! 全組み込みコマンドのメタデータ一覧。新規コマンドは `command_registry!` の一覧に 1 行追加する。
//! `COMMAND_RUNNERS` は `dispatch` から参照され、`COMMANDS` と名前集合が一致すること。

use crate::cmd::{clear, close, exit, group, help_cmd, notes, tabs};
use crate::meta::Cmd;
use crate::model::DispatchJson;

type DispatchCmdFn = fn(&[String]) -> DispatchJson;

macro_rules! command_registry {
    ($($module:ident),* $(,)?) => {
        pub static COMMANDS: &[Cmd] = &[
            $($module::CMD),*
        ];

        pub static COMMAND_RUNNERS: &[(&'static str, DispatchCmdFn)] = &[
            $( ($module::CMD.name, $module::run as DispatchCmdFn) ),*
        ];
    };
}

command_registry! {
    clear,
    close,
    exit,
    group,
    help_cmd,
    tabs,
    notes,
}
