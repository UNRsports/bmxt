//! EN: Expand DispatchBundle msgs / CLI banners using shared i18n (EN + JA).
//! JA: 共有 i18n（EN + JA）で msgs / CLI 案内を展開する。

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use bmxt_core::ir::Msg;
use serde_json::Value;

static EN_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();
static JA_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();
static RUNTIME_LOCALE: OnceLock<Mutex<String>> = OnceLock::new();

const NAMESPACE_JSON: &[&str] = &[
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/cmd.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/help.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/error.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/pipe.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/compound.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/tabs.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/search.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/setting.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/listOutput.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/common.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/shell.json"),
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

fn runtime_locale_lock() -> &'static Mutex<String> {
    RUNTIME_LOCALE.get_or_init(|| Mutex::new(String::new()))
}

/**
 * EN: Locale from env: `ja*` → ja, else en when any LANG/LC_* is set.
 * JA: 環境変数から locale を決める。
 */
pub fn locale_from_env() -> &'static str {
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

/**
 * EN: Resolve locale: committed settings → env → en.
 * JA: 優先順: committed settings → env → en。
 */
pub fn resolve_cli_locale(settings_locale: Option<&str>) -> String {
    if let Some(locale) = settings_locale {
        if locale == "ja" || locale == "en" {
            return locale.to_string();
        }
    }
    locale_from_env().to_string()
}

/** EN: Install runtime locale used by `t_cli` / `expand_msgs` (call at process start / after save). */
pub fn set_runtime_locale(locale: &str) {
    let normalized = if locale == "ja" { "ja" } else { "en" };
    if let Ok(mut guard) = runtime_locale_lock().lock() {
        *guard = normalized.to_string();
    }
}

/**
 * EN: Active CLI locale (runtime override, else env).
 * JA: 実行中の CLI locale（ランタイム上書き、なければ env）。
 */
pub fn cli_locale() -> String {
    if let Ok(guard) = runtime_locale_lock().lock() {
        if !guard.is_empty() {
            return guard.clone();
        }
    }
    locale_from_env().to_string()
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

/** EN: Translate one cmd.* / help.* / setting.* key for CLI stderr/stdout banners. */
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_prefers_settings_over_env() {
        assert_eq!(resolve_cli_locale(Some("en")), "en");
        assert_eq!(resolve_cli_locale(Some("ja")), "ja");
    }

    #[test]
    fn runtime_locale_updates_active_map() {
        set_runtime_locale("en");
        assert_eq!(cli_locale(), "en");
        set_runtime_locale("ja");
        assert_eq!(cli_locale(), "ja");
    }
}
