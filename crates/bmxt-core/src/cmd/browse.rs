use crate::generated::resolve_canonical;
use crate::ir::{msg_key, msg_param, msgs, msgs_with_prompt, ui, DispatchBundle, UiAction};
use crate::line_parse::tokenize;

const USAGE_KEYS: &[&str] = &[
    "cmd.browse.usage.line1",
    "cmd.browse.usage.line2",
    "cmd.browse.usage.line3",
    "cmd.browse.usage.line4",
];

fn list_id_for_canonical(canonical: &str) -> Option<&'static str> {
    match canonical {
        "tab" => Some("tabs"),
        "dom" => Some("dom"),
        "search" => Some("search"),
        "session" => Some("session"),
        "setting" => Some("setting"),
        _ => None,
    }
}

fn parse_tabs_show_url(producer_args: &[String]) -> Result<bool, ()> {
    let mut show_url = false;
    for token in producer_args.iter().skip(2) {
        match token.trim().to_ascii_lowercase().as_str() {
            "-url" => show_url = true,
            _ => return Err(()),
        }
    }
    Ok(show_url)
}

fn is_plain_list_producer(args: &[String]) -> bool {
    args.get(1).map(|t| t.trim().eq_ignore_ascii_case("-list")).unwrap_or(false)
}

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

    let producer_args = tokenize(&line);
    let Some(first) = producer_args.first() else {
        return msgs_with_prompt(
            USAGE_KEYS.iter().map(|k| msg_key(k)).collect(),
            "browse ",
        );
    };
    let Some(canonical) = resolve_canonical(first) else {
        return msgs(vec![msg_param(
            "cmd.browse.error.notListProducer",
            "segment",
            line.trim(),
        )]);
    };
    let Some(list_id) = list_id_for_canonical(canonical) else {
        return msgs(vec![msg_param(
            "cmd.browse.error.notListProducer",
            "segment",
            line.trim(),
        )]);
    };
    if !is_plain_list_producer(&producer_args) {
        return msgs(vec![msg_param(
            "cmd.browse.error.notListProducer",
            "segment",
            line.trim(),
        )]);
    }

    let show_url = if list_id == "tabs" {
        match parse_tabs_show_url(&producer_args) {
            Ok(v) => v,
            Err(()) => {
                return msgs(vec![msg_param(
                    "cmd.browse.error.notListProducer",
                    "segment",
                    line.trim(),
                )]);
            }
        }
    } else {
        false
    };

    ui(UiAction::OpenPicker {
        list_id: list_id.to_string(),
        line: line.trim().to_string(),
        show_url: if show_url {
            "true".to_string()
        } else {
            "false".to_string()
        },
    })
}
