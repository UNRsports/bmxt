use crate::line_parse::parse_http_url_candidate;
use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};
use crate::tabs_man;

pub const CMD: Cmd = Cmd {
    name: "tabs",
    aliases: &[],
    usage_primary: "tabs -l [-u]",
    man: tabs_man::TABS_MAN,
};

fn tabs_usage_lines() -> Vec<String> {
    vec![
        "usage: tabs -l|-list [-u]   — tab picker (optional -u: show each tab URL)".to_string(),
        "       tabs -mu|-moveurl <url> — go to tab with URL or open new tab (Tab completes URLs in BMXt)".to_string(),
        "       tabs -nu|-nowurl       — show current tab URL".to_string(),
    ]
}

fn tabs_run_hint_line() -> String {
    "Run:  tabs -l  or  tabs -l -u  (picker).  tabs -nu  (current URL).  tabs -mu <url>  (jump or new tab)."
        .to_string()
}

fn norm_tabs_flag(arg: Option<&String>) -> Option<char> {
    let a = arg?.to_lowercase();
    match a.as_str() {
        "-l" | "-list" | "--list" => Some('l'),
        "-mu" | "-moveurl" | "--moveurl" => Some('m'),
        "-nu" | "-nowurl" | "--nowurl" => Some('n'),
        _ => None,
    }
}

pub fn run(args: &[String]) -> DispatchJson {
    let sub = norm_tabs_flag(args.get(1));
    if sub.is_none() {
        if args.get(1).is_none() {
            let mut lines = vec!["error: tabs requires a subcommand.".to_string()];
            lines.extend(tabs_usage_lines());
            return DispatchJson::lines(lines);
        }
        let mut lines = vec![format!(
            "error: unknown tabs option: {}",
            args.get(1).map(|s| s.as_str()).unwrap_or("")
        )];
        lines.extend(tabs_usage_lines());
        return DispatchJson::lines(lines);
    }
    match sub.unwrap() {
        'l' => {
            if args.len() > 3 || (args.len() == 3 && args[2].to_lowercase() != "-u") {
                let mut lines = vec!["error: invalid tabs -l usage".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            DispatchJson::lines(vec![
                "Tab picker is opened from the BMXt prompt with:  tabs -l   or   tabs -l -u"
                    .to_string(),
                tabs_run_hint_line(),
            ])
        }
        'n' => {
            if args.len() > 2 {
                let mut lines = vec!["error: too many arguments".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            DispatchJson::effects(vec![Effect::TabsNu])
        }
        'm' => {
            let url_part = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
            let url_part = url_part.trim();
            if url_part.is_empty() {
                let mut lines = vec!["usage: tabs -mu|-moveurl <http(s)-url>".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            let Some(url) = parse_http_url_candidate(url_part) else {
                let mut lines = vec!["usage: tabs -mu|-moveurl <http(s)-url>".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            };
            DispatchJson::effects(vec![Effect::TabsMoveUrl { url }])
        }
        _ => unreachable!(),
    }
}
