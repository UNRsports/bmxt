//! EN: Example — command that only reuses an existing UiAction kind.
//! JA: 既存 UiAction 語彙のみを返すコマンド例。
//! Copy into crates/bmxt-core/src/cmd/<module>.rs and adjust.
//! See manifest/templates/new-command.checklist.md (reuse-ui-action).

use crate::ir::{msg_key, msgs, ui, DispatchBundle, UiAction};

pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return msgs(vec![msg_key("cmd.browse.usage.line1")]);
    }
    let line = args.iter().skip(1).cloned().collect::<Vec<_>>().join(" ");
    if line.trim().is_empty() {
        return msgs(vec![msg_key("cmd.browse.usage.line1")]);
    }
    // EN: Prefer generic Host IR kinds (bmxt-host/2); no new TS executor.
    ui(UiAction::OpenPicker {
        list_id: "tabs".to_string(),
        line: line.trim().to_string(),
        show_url: "false".to_string(),
    })
}
