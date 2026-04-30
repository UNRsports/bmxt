use crate::meta::Cmd;
use crate::model::DispatchJson;

pub const CMD: Cmd = Cmd {
    name: "echo",
    aliases: &[],
    usage_primary: "echo [text...]",
    man: &["NAME", "  echo - print arguments", "", "SYNOPSIS", "  echo [text...]"],
};

pub fn run(args: &[String]) -> DispatchJson {
    let joined = args.iter().skip(1).cloned().collect::<Vec<_>>().join(" ");
    DispatchJson::lines(vec![format_echo(&joined)])
}

fn format_echo(joined: &str) -> String {
    if joined.is_empty() {
        "(empty)".to_string()
    } else {
        joined.to_string()
    }
}
