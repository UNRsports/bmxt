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
    lines.push("Quick start: type `tabs` and press Enter, then continue with the shown options.".to_string());
    lines.push(String::new());
    lines.push("Built-in commands:".to_string());
    for name in names {
        let cmd = cmd_by_name(name).unwrap();
        let aliases = if cmd.aliases.is_empty() {
            String::new()
        } else {
            format!(" | {}", cmd.aliases.join(" | "))
        };
        lines.push(format!("  {}{}", cmd.usage_primary, aliases));
    }
    lines.push(String::new());
    lines.push("tabs (BMXt window / SW):".to_string());
    lines.push(
        "  tabs              - show available options, then restore prompt to `tabs ` for continuation."
            .to_string(),
    );
    lines.push(
        "  tabs -list [-u]   - open tab picker (`-u` shows URL rows under each title)."
            .to_string(),
    );
    lines.push(
        "  tabs -nowurl      - print current tab URL from active tab in focused window.".to_string(),
    );
    lines.push(
        "  tabs -moveurl <url> - focus matching URL tab or open a new tab if none match.".to_string(),
    );
    lines.push(
        "  picker `:` mode   - empty Tab/Enter shows dim target-aware commands (tab/window/group)."
            .to_string(),
    );
    lines.push(String::new());
    lines.push("split (terminal panes):".to_string());
    lines.push(
        "  split               - show -col / -row, then restore prompt to `split ` for continuation."
            .to_string(),
    );
    lines.push("  split -col          - vertical split (new pane beside current).".to_string());
    lines.push("  split -row          - horizontal split (new pane below current).".to_string());
    lines.push(
        "  Ctrl+Arrow          - move keyboard focus between panes when more than one is open."
            .to_string(),
    );
    lines.push(String::new());
    lines.push("dom (page view filter on the active target tab):".to_string());
    lines.push(
        "  dom -show   -html|-react       — print DOM structure to the terminal (HTML or React-style outline)."
            .to_string(),
    );
    lines.push(
        "  dom -select -html|-react <css…>  — show only matched nodes (reload page to clear)."
            .to_string(),
    );
    lines.push(
        "  dom -hide   -html|-react <css…>  — hide matched nodes (reload page to clear)."
            .to_string(),
    );
    lines.push(String::new());
    lines.push("grep (in-memory search; nothing persisted by these commands):".to_string());
    lines.push("  grep -history <pattern>   — titles/URLs in recent history.".to_string());
    lines.push("  grep -bookmark <pattern>  — bookmark titles/URLs.".to_string());
    lines.push(
        "  grep -page <pattern>      — innerText lines in non-discarded http(s) tabs.".to_string(),
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
