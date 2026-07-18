use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub use crate::generated::ChromeEffect;

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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum UiAction {
    #[serde(rename = "show_help")]
    ShowHelp,
    #[serde(rename = "nav_arm")]
    NavArm,
    #[serde(rename = "nav_disarm")]
    NavDisarm,
    #[serde(rename = "open_plain_list")]
    OpenPlainList { list_id: String, line: String },
    #[serde(rename = "close_picker")]
    ClosePicker { slot: String },
    #[serde(rename = "continuation_prompt")]
    ContinuationPrompt { prefix: String },
    #[serde(rename = "session_list")]
    SessionList,
    #[serde(rename = "session_switch")]
    SessionSwitch { name: String },
    #[serde(rename = "session_setting_name")]
    SessionSettingName { name: String },
    #[serde(rename = "group_new_from_selection")]
    GroupNewFromSelection,
    #[serde(rename = "translate_on")]
    TranslateOn,
    #[serde(rename = "translate_off")]
    TranslateOff,
    #[serde(rename = "translate_setting")]
    TranslateSetting { pair: String },
    #[serde(rename = "snapshot_save")]
    SnapshotSave { line: String },
    #[serde(rename = "setting_list")]
    SettingList,
    #[serde(rename = "setting_exit_list")]
    SettingExitList,
    #[serde(rename = "tabs_exit_list")]
    TabsExitList,
    #[serde(rename = "tabs_setting")]
    TabsSetting { mode: String },
    #[serde(rename = "search_exit_list")]
    SearchExitList,
    #[serde(rename = "dom_exit_list")]
    DomExitList,
    #[serde(rename = "dom_setting")]
    DomSetting { mode: String },
    #[serde(rename = "browse")]
    Browse { line: String },
    #[serde(rename = "picker_pass")]
    PickerPass,
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
