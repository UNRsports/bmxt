//! 新規コマンドの骨格。`__NAME__` を正しいモジュール名に置換し、`cmd/mod.rs` と `registry/table.rs` の
//! `command_registry! { ... }` に追加する。詳細は `../ADD_COMMAND.md`。

/*
use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "__name__",
    aliases: &[],
    usage_primary: "__name__",
};

pub fn run(args: &[String]) -> DispatchJson {
    let _ = args;
    DispatchJson::lines(vec!["not implemented".to_string()])
}

*/
