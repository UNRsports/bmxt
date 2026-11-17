use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub use crate::generated::HostEffect;
pub use crate::generated::UiAction;

/// EN: POSIX-inspired plan-time exit status (compound / pipe short-circuit).
pub const EXIT_SUCCESS: i32 = 0;
pub const EXIT_FAILURE: i32 = 1;
pub const EXIT_MISUSE: i32 = 2;
pub const EXIT_NOT_FOUND: i32 = 127;

fn default_exit_success() -> i32 {
    EXIT_SUCCESS
}

fn skip_exit_success(status: &i32) -> bool {
    *status == EXIT_SUCCESS
}

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
    Lines {
        lines: Vec<String>,
        #[serde(
            default = "default_exit_success",
            rename = "exitStatus",
            skip_serializing_if = "skip_exit_success"
        )]
        exit_status: i32,
    },
    #[serde(rename = "effects")]
    Effects {
        effects: Vec<HostEffect>,
        #[serde(
            default = "default_exit_success",
            rename = "exitStatus",
            skip_serializing_if = "skip_exit_success"
        )]
        exit_status: i32,
    },
    #[serde(rename = "ui")]
    Ui {
        action: UiAction,
        #[serde(
            default = "default_exit_success",
            rename = "exitStatus",
            skip_serializing_if = "skip_exit_success"
        )]
        exit_status: i32,
    },
    #[serde(rename = "msgs")]
    Msgs {
        msgs: Vec<Msg>,
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            rename = "promptPrefix"
        )]
        prompt_prefix: Option<String>,
        #[serde(
            default = "default_exit_success",
            rename = "exitStatus",
            skip_serializing_if = "skip_exit_success"
        )]
        exit_status: i32,
    },
}

impl DispatchBundle {
    /** EN: Plan-time exit status stamped by Rust (host must not scrape display text). */
    pub fn exit_status(&self) -> i32 {
        match self {
            DispatchBundle::Lines { exit_status, .. }
            | DispatchBundle::Effects { exit_status, .. }
            | DispatchBundle::Ui { exit_status, .. }
            | DispatchBundle::Msgs { exit_status, .. } => *exit_status,
        }
    }
}

pub fn lines(lines: Vec<String>) -> DispatchBundle {
    DispatchBundle::Lines {
        lines,
        exit_status: EXIT_SUCCESS,
    }
}

pub fn effects(effects: Vec<HostEffect>) -> DispatchBundle {
    DispatchBundle::Effects {
        effects,
        exit_status: EXIT_SUCCESS,
    }
}

pub fn ui(action: UiAction) -> DispatchBundle {
    DispatchBundle::Ui {
        action,
        exit_status: EXIT_SUCCESS,
    }
}

/// EN: Default msgs channel = misuse (usage / error). Prefer `msgs_ok` for help/info.
pub fn msgs(msgs: Vec<Msg>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: None,
        exit_status: EXIT_MISUSE,
    }
}

/// EN: Informational msgs (help / manuals) — compound success.
pub fn msgs_ok(msgs: Vec<Msg>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: None,
        exit_status: EXIT_SUCCESS,
    }
}

/// EN: Unknown command msgs — exit 127.
pub fn msgs_not_found(msgs: Vec<Msg>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: None,
        exit_status: EXIT_NOT_FOUND,
    }
}

pub fn msgs_with_prompt(msgs: Vec<Msg>, prompt_prefix: impl Into<String>) -> DispatchBundle {
    DispatchBundle::Msgs {
        msgs,
        prompt_prefix: Some(prompt_prefix.into()),
        exit_status: EXIT_MISUSE,
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
