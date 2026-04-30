//! help / man / 補完トークンなど、レジストリテーブルを読む API。

use crate::meta::Cmd;
use super::table;

pub static URL_MAN: &[&str] = &[
    "NAME",
    "  URL line - open http(s) addresses without a command name",
    "",
    "SYNOPSIS",
    "  https://example.com",
    "  https://example.com .",
    "  https://example.com -nw",
    "",
    "DESCRIPTION",
    "  Bare URL on one line (no spaces in the URL) opens a new tab.",
    "  A trailing space and period ( . ) navigates the current active tab.",
    "  A trailing space and -nw opens a new browser window.",
    "",
    "NOTE",
    "  Current tab uses the same target resolution as back/forward (focused window).",
    "  Only http: and https: schemes are accepted.",
];

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

pub fn list_man_topics() -> Vec<String> {
    let mut v: Vec<String> = table::COMMANDS.iter().map(|c| c.name.to_string()).collect();
    v.push("url".to_string());
    v.sort();
    v
}

pub fn get_man_lines(topic_raw: &str) -> Option<Vec<String>> {
    let key = topic_raw.trim().to_lowercase();
    if key == "url" {
        let mut page = vec![format!("{}(1)", key.to_uppercase())];
        page.extend(URL_MAN.iter().map(|s| (*s).to_string()));
        return Some(page);
    }
    if let Some(cmd) = table::COMMANDS.iter().find(|c| c.name == key) {
        let mut page = vec![format!("{}(1)", key.to_uppercase())];
        page.extend(cmd.man.iter().map(|s| (*s).to_string()));
        return Some(page);
    }
    let canon = resolve_canonical(&key)?;
    let cmd = cmd_by_name(canon)?;
    let mut page = vec![format!(
        "{}(1)  (same as {})",
        key.to_uppercase(),
        cmd.name
    )];
    page.extend(cmd.man.iter().map(|s| (*s).to_string()));
    Some(page)
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
    lines.push("  man [topic]  - manual page for a command".to_string());
    lines.push(String::new());
    lines.push("tabs (BMXt window / SW):".to_string());
    lines.push(
        "  tabs -l [-u]  - tab picker: j/k move, / filter (@... URL), Enter page, Esc exit."
            .to_string(),
    );
    lines.push(
        "  tabs -nu        - print current tab URL   tabs -mu <url>  - jump to URL tab or open new tab"
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
