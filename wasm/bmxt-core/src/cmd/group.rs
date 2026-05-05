use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "group",
    aliases: &[],
    usage_primary: "group new",
};

pub fn run(args: &[String]) -> DispatchJson {
    if args.get(1).map(|s| s.to_lowercase()).as_deref() != Some("new") {
        return DispatchJson::lines(vec![
            "usage: group new | group new <tabId> [tabId ...]".to_string(),
        ]);
    }
    let tab_ids: Vec<i32> = args
        .iter()
        .skip(2)
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    if tab_ids.is_empty() {
        return DispatchJson::lines(vec![
            "Interactive: in BMXt type  group new  and Enter (no tab ids).".to_string(),
            "Non-interactive: group new <tabId> [tabId ...]".to_string(),
        ]);
    }
    DispatchJson::effects(vec![Effect::GroupNew { tab_ids }])
}
