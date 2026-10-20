//! EN: Example — command that only reuses existing ChromeEffect vocabulary.
//! JA: 既存 ChromeEffect 語彙のみを返すコマンド例。
//! Copy into crates/bmxt-core/src/cmd/<module>.rs and adjust.
//! See manifest/templates/new-command.checklist.md (reuse-effects).

use crate::ir::{effects, msgs, ChromeEffect, DispatchBundle, Msg};

pub fn run(args: &[String]) -> DispatchBundle {
    let id_str = args.get(1).map(String::as_str).unwrap_or("");
    match id_str.parse::<i64>() {
        Ok(tab_id) if tab_id >= 0 => effects(vec![ChromeEffect::CloseTab { tab_id }]),
        _ => msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]),
    }
}
