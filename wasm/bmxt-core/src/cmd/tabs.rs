use crate::line_parse::parse_http_url_candidate;
use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "tabs",
    aliases: &[],
    usage_primary: "tabs -list [-u]",
};

fn tabs_usage_lines() -> Vec<String> {
    vec![
        "usage: tabs -list [-u]   — tab picker (optional -u: show each tab URL)".to_string(),
        "       tabs -moveurl <url> — go to tab with URL or open new tab (Tab completes URLs in BMXt)".to_string(),
        "       tabs -nowurl       — show current tab URL".to_string(),
    ]
}

fn tabs_run_hint_line() -> String {
    "Run:  tabs -list  or  tabs -list -u  (picker).  tabs -nowurl  (current URL).  tabs -moveurl <url>  (jump or new tab)."
        .to_string()
}

fn norm_tabs_flag(arg: Option<&String>) -> Option<char> {
    let a = arg?.to_lowercase();
    match a.as_str() {
        "-list" => Some('l'),
        "-moveurl" => Some('m'),
        "-nowurl" => Some('n'),
        _ => None,
    }
}

pub fn run(args: &[String]) -> DispatchJson {
    if args.get(1).is_none() {
        let mut lines = vec!["tabs: available options".to_string()];
        lines.extend(tabs_usage_lines());
        return DispatchJson::lines(lines);
    }
    let first = args[1].as_str();
    if !crate::generated::command_subcommands::is_second_token("tabs", first) {
        let mut lines = vec![format!("error: unknown tabs option: {first}")];
        lines.extend(tabs_usage_lines());
        return DispatchJson::lines(lines);
    }
    let sub = norm_tabs_flag(args.get(1)).expect("manifest subcommands must match cmd/tabs.rs norm_tabs_flag");
    match sub {
        'l' => {
            if args.len() > 3 || (args.len() == 3 && args[2].to_lowercase() != "-u") {
                let mut lines = vec!["error: invalid tabs -list usage".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            DispatchJson::lines(vec![
                "Tab picker is opened from the BMXt prompt with:  tabs -list   or   tabs -list -u"
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
                let mut lines = vec!["usage: tabs -moveurl <http(s)-url>".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            }
            let Some(url) = parse_http_url_candidate(url_part) else {
                let mut lines = vec!["usage: tabs -moveurl <http(s)-url>".to_string()];
                lines.extend(tabs_usage_lines());
                return DispatchJson::lines(lines);
            };
            DispatchJson::effects(vec![Effect::TabsMoveUrl { url }])
        }
        _ => unreachable!(),
    }
}
