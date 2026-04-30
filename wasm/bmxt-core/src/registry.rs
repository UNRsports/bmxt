//! コマンド名・別名・man / help 用静的データ。

pub struct Cmd {
    pub name: &'static str,
    pub aliases: &'static [&'static str],
    pub usage_primary: &'static str,
    pub man: &'static [&'static str],
}

pub static COMMANDS: &[Cmd] = &[
    Cmd {
        name: "activate",
        aliases: &["a"],
        usage_primary: "activate <tabId>",
        man: &[
            "NAME",
            "  activate, a - focus a tab and its window",
            "",
            "SYNOPSIS",
            "  activate <tabId>",
            "  a <tabId>",
        ],
    },
    Cmd {
        name: "back",
        aliases: &["b"],
        usage_primary: "back [tabId]",
        man: &[
            "NAME",
            "  back, b - navigate the tab history backward",
            "",
            "SYNOPSIS",
            "  back [tabId]",
            "",
            "DESCRIPTION",
            "  If tabId is omitted, uses the active tab in the last focused window",
            "  (with fallbacks; see focus).",
        ],
    },
    Cmd {
        name: "clear",
        aliases: &[],
        usage_primary: "clear",
        man: &[
            "NAME",
            "  clear - clear the on-screen session log",
            "",
            "SYNOPSIS",
            "  clear",
            "",
            "NOTE",
            "  Does not clear command history (up/down or Ctrl+R).",
        ],
    },
    Cmd {
        name: "close",
        aliases: &["c"],
        usage_primary: "close <tabId>",
        man: &[
            "NAME",
            "  close, c - close a tab",
            "",
            "SYNOPSIS",
            "  close <tabId>",
            "  c <tabId>",
        ],
    },
    Cmd {
        name: "echo",
        aliases: &[],
        usage_primary: "echo [text...]",
        man: &["NAME", "  echo - print arguments", "", "SYNOPSIS", "  echo [text...]"],
    },
    Cmd {
        name: "focus",
        aliases: &[],
        usage_primary: "focus",
        man: &[
            "NAME",
            "  focus - show last focused window tracking",
            "",
            "SYNOPSIS",
            "  focus",
            "",
            "NOTE",
            "  Used when tab id is omitted for back / forward.",
        ],
    },
    Cmd {
        name: "forward",
        aliases: &["fwd"],
        usage_primary: "forward [tabId]",
        man: &[
            "NAME",
            "  forward, fwd - navigate the tab history forward",
            "",
            "SYNOPSIS",
            "  forward [tabId]",
            "  fwd [tabId]",
        ],
    },
    Cmd {
        name: "group",
        aliases: &[],
        usage_primary: "group new",
        man: &[
            "NAME",
            "  group - create a tab group from tab ids",
            "",
            "SYNOPSIS",
            "  group new",
            "  group new <tabId> [tabId ...]",
            "",
            "INTERACTIVE",
            "  Run  group new  alone (Enter) in the BMXt window to open the picker:",
            "  arrow keys move highlight, Tab toggles selection, Enter sets name and color.",
            "",
            "NOTE",
            "  Tabs must belong to the same window.",
        ],
    },
    Cmd {
        name: "groups",
        aliases: &["gls"],
        usage_primary: "groups",
        man: &["NAME", "  groups, gls - list tab groups", "", "SYNOPSIS", "  groups | gls"],
    },
    Cmd {
        name: "help",
        aliases: &["?"],
        usage_primary: "help",
        man: &[
            "NAME",
            "  help, ? - list commands and BMXt window keys",
            "",
            "SYNOPSIS",
            "  help",
            "",
            "SEE ALSO",
            "  man(1) for per-command manuals; man url for typed-URL opening",
        ],
    },
    Cmd {
        name: "man",
        aliases: &[],
        usage_primary: "man [topic]",
        man: &[
            "NAME",
            "  man - show manual for a command",
            "",
            "SYNOPSIS",
            "  man [topic]",
            "",
            "DESCRIPTION",
            "  Without topic, prints available manual pages.",
            "  With topic, prints a short reference for that command.",
            "",
            "SEE ALSO",
            "  help",
        ],
    },
    Cmd {
        name: "move",
        aliases: &["mv"],
        usage_primary: "move <tabId> <windowId> [index]",
        man: &[
            "NAME",
            "  move, mv - move a tab to another window",
            "",
            "SYNOPSIS",
            "  move <tabId> <windowId> [index]",
            "  mv <tabId> <windowId> [index]",
            "",
            "DESCRIPTION",
            "  index defaults to end of the target window when omitted.",
        ],
    },
    Cmd {
        name: "new",
        aliases: &[],
        usage_primary: "new [url]",
        man: &[
            "NAME",
            "  new - open a new tab",
            "",
            "SYNOPSIS",
            "  new [url]",
            "",
            "DESCRIPTION",
            "  If url is omitted, opens the new tab page.",
        ],
    },
    Cmd {
        name: "tabs",
        aliases: &[],
        usage_primary: "tabs -l [-u]",
        man: crate::tabs_man::TABS_MAN,
    },
    Cmd {
        name: "windows",
        aliases: &["wins"],
        usage_primary: "windows",
        man: &[
            "NAME",
            "  windows, wins - list browser windows",
            "",
            "SYNOPSIS",
            "  windows | wins",
            "",
            "OUTPUT",
            "  One line per window: optional leading * if focused, then the active",
            "  tab title only (no window id or type).",
        ],
    },
];

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
    for c in COMMANDS {
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
    COMMANDS.iter().find(|c| c.name == name)
}

pub fn list_man_topics() -> Vec<String> {
    let mut v: Vec<String> = COMMANDS.iter().map(|c| c.name.to_string()).collect();
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
    if let Some(cmd) = COMMANDS.iter().find(|c| c.name == key) {
        let mut page = vec![format!("{}(1)", key.to_uppercase())];
        page.extend(cmd.man.iter().map(|s| (*s).to_string()));
        return Some(page);
    }
    // alias -> canonical
    let canon = resolve_canonical(&key)?;
    // avoid infinite - resolve canonical name must hit cmd name
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
    let mut names: Vec<&str> = COMMANDS.iter().map(|c| c.name).collect();
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
    for c in COMMANDS {
        s.insert(c.name.to_string());
        for a in c.aliases {
            s.insert((*a).to_string());
        }
    }
    s.into_iter().collect()
}
