//! EN: Expand DispatchBundle msgs using shared EN strings (cmd / help / error / …).
//! JA: 共有 EN 文字列で msgs を展開する。

use std::collections::HashMap;
use std::sync::OnceLock;

use bmxt_core::ir::Msg;
use serde_json::Value;

static EN_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

const NAMESPACE_JSON: &[&str] = &[
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/cmd.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/help.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/error.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/pipe.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/compound.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/tabs.json"),
    include_str!("../../../shared/lib/features/setting/i18n/namespaces/search.json"),
];

fn en_map() -> &'static HashMap<String, String> {
    EN_MAP.get_or_init(|| {
        let mut map = HashMap::new();
        for raw in NAMESPACE_JSON {
            let Ok(value) = serde_json::from_str::<Value>(raw) else {
                continue;
            };
            let Some(obj) = value.as_object() else {
                continue;
            };
            for (key, entry) in obj {
                if let Some(en) = entry.get("en").and_then(|v| v.as_str()) {
                    map.insert(key.clone(), en.to_string());
                }
            }
        }
        map
    })
}

pub fn expand_msgs(msgs: &[Msg]) -> Vec<String> {
    let map = en_map();
    let mut lines = Vec::new();
    for msg in msgs {
        let template = map
            .get(&msg.key)
            .cloned()
            .unwrap_or_else(|| msg.key.clone());
        let line = match &msg.params {
            Some(params) => {
                let mut out = template;
                for (k, v) in params {
                    out = out.replace(&format!("{{{k}}}"), v);
                }
                out
            }
            None => template,
        };
        lines.push(line);
    }
    lines
}
