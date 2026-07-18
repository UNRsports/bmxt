use crate::ir::{msg_key, msgs, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.browse.usage.line1",
    "cmd.browse.usage.line2",
    "cmd.browse.usage.line3",
    "cmd.browse.usage.line4",
];

pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect());
    }
    let line = args.iter().skip(1).cloned().collect::<Vec<_>>().join(" ");
    if line.trim().is_empty() {
        return msgs(USAGE_KEYS.iter().map(|k| msg_key(k)).collect());
    }
    ui(UiAction::Browse { line })
}
