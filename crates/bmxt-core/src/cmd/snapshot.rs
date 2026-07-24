use crate::cmd::helpers;
use crate::ir::{msg_key, msg_param, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &["cmd.snapshot.usage.line1", "cmd.snapshot.usage.line2"];

pub fn run(args: &[String]) -> DispatchBundle {
    let first_lc = match helpers::require_second_token("snapshot", args, USAGE_KEYS) {
        Ok(v) => v,
        Err(bundle) => return bundle,
    };

    if first_lc == "-save" {
        let line = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
        return ui(UiAction::SnapshotSave { line });
    }

    let option = args.get(1).map(String::as_str).unwrap_or("");
    let mut msgs_vec = vec![msg_param("cmd.snapshot.error.internal", "option", option)];
    for key in USAGE_KEYS {
        msgs_vec.push(msg_key(key));
    }
    msgs(msgs_vec)
}
