use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub use crate::generated::ChromeEffect;
pub use crate::generated::UiAction;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Msg {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "ty")]
pub enum DispatchBundle {
    #[serde(rename = "lines")]
    Lines { lines: Vec<String> },
    #[serde(rename = "effects")]
    Effects { effects: Vec<ChromeEffect> },
    #[serde(rename = "ui")]
    Ui { action: UiAction },
    #[serde(rename = "msgs")]
    Msgs {
        msgs: Vec<Msg>,
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            rename = "promptPrefix"
        )]
        prompt_prefix: Option<String>,
    },
}

pub fn lines(lines: Vec<String>) -> DispatchBundle {
    DispatchBundle::Lines { lines }
}

pub fn effects(effects: Vec<ChromeEffect>) -> DispatchBundle {
    DispatchBundle::Effects { effects }
}

pub fn ui(action: UiAction) -> DispatchBundle {
    DispatchBundle::Ui { action }
}

pub fn msgs(msgs: Vec<Msg>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: None,
    }
}

pub fn msgs_with_prompt(msgs: Vec<Msg>, prompt_prefix: impl Into<String>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: Some(prompt_prefix.into()),
    }
}

pub fn msg_key(key: &str) -> Msg {
    Msg {
        key: key.to_string(),
        params: None,
    }
}

pub fn msg_with(key: &str, params: BTreeMap<String, String>) -> Msg {
    Msg {
        key: key.to_string(),
        params: Some(params),
    }
}

pub fn msg_param(key: &str, name: &str, value: &str) -> Msg {
    let mut params = BTreeMap::new();
    params.insert(name.to_string(), value.to_string());
    msg_with(key, params)
}

pub fn msgs_from_keys(keys: &[&str]) -> DispatchBundle {
    msgs(keys.iter().map(|k| msg_key(k)).collect())
}
