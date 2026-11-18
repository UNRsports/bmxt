use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SealedEnvelope {
    pub version: u32,
    pub family_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub kind: SealKind,
    pub created_at: String,
    pub expires_at: String,
    pub ciphertext_b64: String,
    pub iv_b64: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SealKind {
    Signal,
    Command,
}
