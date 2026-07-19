use crate::ir::{msg_key, msgs_with_prompt, ui, DispatchBundle, UiAction};

const USAGE_KEYS: &[&str] = &[
    "cmd.browse.usage.line1",
    "cmd.browse.usage.line2",
    "cmd.browse.usage.line3",
    "cmd.browse.usage.line4",
];

pub fn run(args: &[String]) -> DispatchBundle {
    if args.len() <= 1 {
        return msgs_with_prompt(
            USAGE_KEYS.iter().map(|k| msg_key(k)).collect(),
            "browse ",
        );
    }
    let line = args.iter().skip(1).cloned().collect::<Vec<_>>().join(" ");
    if line.trim().is_empty() {
        return msgs_with_prompt(
            USAGE_KEYS.iter().map(|k| msg_key(k)).collect(),
            "browse ",
        );
    }
    ui(UiAction::Browse { line })
}
