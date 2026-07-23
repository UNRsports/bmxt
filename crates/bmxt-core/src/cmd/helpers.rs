use crate::generated::is_second_token;
use crate::ir::{msg_key, msg_param, msgs, DispatchBundle};
use crate::line_parse::strip_invisible_format_chars;

pub fn normalize_token(tok: &str) -> String {
    strip_invisible_format_chars(tok.trim()).to_ascii_lowercase()
}

pub fn unknown_option(command: &str, option: &str, usage_keys: &[&str]) -> DispatchBundle {
    let mut keys = vec![match command {
        "dom" => msg_param("cmd.dom.error.unknownOption", "option", option),
        "search" => msg_param("cmd.search.error.unknownOption", "option", option),
        "tab" => msg_param("cmd.tabs.error.unknownOption", "option", option),
        "nav" => msg_param("cmd.nav.error.unknownOption", "option", option),
        "translate" => msg_param("cmd.translate.error.unknownOption", "option", option),
        "session" => msg_param("cmd.session.error.unknownOption", "option", option),
        "snapshot" => msg_param("cmd.snapshot.error.unknownOption", "option", option),
        "setting" => msg_param("cmd.setting.error.unknownOption", "option", option),
        _ => msg_param("cmd.error.unknownCommand", "cmdToken", option),
    }];
    for key in usage_keys {
        keys.push(msg_key(key));
    }
    msgs(keys)
}

pub fn require_second_token(
    canonical: &str,
    args: &[String],
    usage_keys: &[&str],
) -> Result<String, DispatchBundle> {
    let Some(first) = args.get(1) else {
        let mut keys = vec![msg_param(
            "cmd.common.availableOptions",
            "command",
            canonical,
        )];
        for key in usage_keys {
            keys.push(msg_key(key));
        }
        return Err(crate::ir::msgs_with_prompt(
            keys,
            format!("{canonical} "),
        ));
    };
    if !is_second_token(canonical, first) {
        return Err(unknown_option(canonical, first, usage_keys));
    }
    Ok(normalize_token(first))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_second_token_emits_prompt_prefix() {
        let err = require_second_token("tab", &["tab".to_string()], &["cmd.tabs.usage.line1"])
            .expect_err("missing second");
        let raw = serde_json::to_string(&err).unwrap();
        assert!(raw.contains(r#""promptPrefix":"tab ""#), "{raw}");
        assert!(raw.contains("cmd.common.availableOptions"), "{raw}");
    }
}
