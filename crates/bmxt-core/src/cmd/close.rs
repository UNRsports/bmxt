use crate::ir::{effects, msgs, ChromeEffect, DispatchBundle, Msg};

pub fn run(args: &[String]) -> DispatchBundle {
    let id_str = args.get(1).map(String::as_str).unwrap_or("");
    let id = id_str.parse::<i64>();
    match id {
        Ok(tab_id) if tab_id >= 0 => effects(vec![ChromeEffect::CloseTab { tab_id }]),
        _ => msgs(vec![Msg {
            key: "cmd.close.usage".to_string(),
            params: None,
        }]),
    }
}
