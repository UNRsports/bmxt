//! EN: Example — command that only reuses existing HostEffect vocabulary.
//! JA: 既存 HostEffect 語彙のみを返すコマンド例。
//! Copy into crates/bmxt-core/src/cmd/<module>.rs and adjust.
//! See manifest/templates/new-command.checklist.md (reuse-effects).

use crate::ir::{effects, msgs, HostEffect, DispatchBundle, Msg};

pub fn run(args: &[String]) -> DispatchBundle {
    let id_str = args.get(1).map(String::as_str).unwrap_or("");
    match id_str.parse::<i64>() {
        Ok(tab_id) if tab_id >= 0 => effects(vec![HostEffect::CloseTab { tab_id }]),
        _ => msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]),
    }
}
