//! EN: Expand DispatchBundle msgs / CLI banners using shared i18n (EN + JA).
//! JA: 共有 i18n（EN + JA）で msgs / CLI 案内を展開する。

use std::collections::HashMap;
use std::sync::OnceLock;

use bmxt_core::ir::Msg;
use serde_json::Value;

static EN_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();
static JA_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

const NAMESPACE_JSON: &[&str] = &[
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/cmd.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/help.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/error.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/pipe.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/compound.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/tabs.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/search.json"),
];

fn load_locale_map(locale: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for raw in NAMESPACE_JSON {
        let Ok(value) = serde_json::from_str::<Value>(raw) else {
            continue;
        };
        let Some(obj) = value.as_object() else {
            continue;
        };
        for (key, entry) in obj {
            if let Some(text) = entry.get(locale).and_then(|v| v.as_str()) {
                map.insert(key.clone(), text.to_string());
            }
        }
    }
    map
}

fn en_map() -> &'static HashMap<String, String> {
    EN_MAP.get_or_init(|| load_locale_map("en"))
}

fn ja_map() -> &'static HashMap<String, String> {
    JA_MAP.get_or_init(|| load_locale_map("ja"))
}

/**
 * EN: Prefer Japanese when LANG / LC_ALL / LC_MESSAGES starts with `ja`.
 * JA: LANG / LC_ALL / LC_MESSAGES が `ja` 始まりなら日本語。
 */
pub fn cli_locale() -> &'static str {
    for key in ["LC_ALL", "LC_MESSAGES", "LANG"] {
        if let Ok(val) = std::env::var(key) {
            let lower = val.to_ascii_lowercase();
            if lower.starts_with("ja") {
                return "ja";
            }
            if !val.is_empty() {
                return "en";
            }
        }
    }
    "en"
}

fn active_map() -> &'static HashMap<String, String> {
    if cli_locale() == "ja" {
        ja_map()
    } else {
        en_map()
    }
}

fn apply_params(template: &str, params: &[(&str, &str)]) -> String {
    let mut out = template.to_string();
    for (k, v) in params {
        out = out.replace(&format!("{{{k}}}"), v);
    }
    out
}

/** EN: Translate one cmd.* / help.* key for CLI stderr/stdout banners. */
pub fn t_cli(key: &str, params: &[(&str, &str)]) -> String {
    let map = active_map();
    let template = map
        .get(key)
        .cloned()
        .or_else(|| en_map().get(key).cloned())
        .unwrap_or_else(|| key.to_string());
    apply_params(&template, params)
}

pub fn expand_msgs(msgs: &[Msg]) -> Vec<String> {
    let map = active_map();
    let en = en_map();
    let mut lines = Vec::new();
    for msg in msgs {
        let template = map
            .get(&msg.key)
            .cloned()
            .or_else(|| en.get(&msg.key).cloned())
            .unwrap_or_else(|| msg.key.clone());
        let line = match &msg.params {
            Some(params) => {
                let pairs: Vec<(&str, &str)> = params
                    .iter()
                    .map(|(k, v)| (k.as_str(), v.as_str()))
                    .collect();
                apply_params(&template, &pairs)
            }
            None => template,
        };
        lines.push(line);
    }
    lines
}
