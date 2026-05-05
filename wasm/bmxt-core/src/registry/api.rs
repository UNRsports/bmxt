//! help / 補完トークンなど、レジストリテーブルを読む API。

use crate::meta::Cmd;
use super::table;

pub fn resolve_canonical(cmd: &str) -> Option<&'static str> {
    let k = cmd.to_lowercase();
    for c in table::COMMANDS {
        if c.name == k {
            return Some(c.name);
        }
        for a in c.aliases {
            if **a == k {
                return Some(c.name);
            }
        }
    }
    None
}

pub fn cmd_by_name(name: &str) -> Option<&'static Cmd> {
    table::COMMANDS.iter().find(|c| c.name == name)
}

pub fn build_help_lines() -> Vec<String> {
    let mut names: Vec<&str> = table::COMMANDS.iter().map(|c| c.name).collect();
    names.sort();
    let mut lines = vec!["BMXt - browser command shell".to_string()];
    for name in names {
        let cmd = cmd_by_name(name).unwrap();
        let aliases = if cmd.aliases.is_empty() {
            String::new()
        } else {
            format!(" | {}", cmd.aliases.join(" | "))
        };
        lines.push(format!("  {}{}", cmd.usage_primary, aliases));
    }
    lines.push("tabs (BMXt window / SW):".to_string());
    lines.push(
        "  tabs -list [-u]  - tab picker: ↑↓ move, / filter (@... URL), Enter page, Esc exit."
            .to_string(),
    );
    lines.push(
        "  tabs -nowurl      - print current tab URL   tabs -moveurl <url>  - jump to URL tab or open new tab"
            .to_string(),
    );
    lines.push(String::new());
    lines.push("URL (http/https, typed as a whole line):".to_string());
    lines.push("  <url>           - new tab".to_string());
    lines.push("  <url> .         - current tab (active tab in focused window)".to_string());
    lines.push("  <url> -nw       - new window".to_string());
    lines.push(String::new());
    lines.push("BMXt window keys:".to_string());
    lines.push("  One terminal view (output then prompt); focus the window to type.".to_string());
    lines.push("  left/right/home/end  move cursor in the current line.".to_string());
    lines.push("  Tab  command completion (repeat to cycle matches).".to_string());
    lines.push(
        "  up/down  command history   Ctrl+R  reverse-i-search (again: older match)".to_string(),
    );
    lines.push("  Enter  run or accept search   Esc  cancel search".to_string());
    lines
}

pub fn all_completion_tokens() -> Vec<String> {
    use std::collections::BTreeSet;
    let mut s = BTreeSet::new();
    for c in table::COMMANDS {
        s.insert(c.name.to_string());
        for a in c.aliases {
            s.insert((*a).to_string());
        }
    }
    s.into_iter().collect()
}
