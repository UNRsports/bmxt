use serde::{Deserialize, Serialize};

use crate::b64::{base64url_to_bytes, bytes_to_base64url};
use crate::seal::{parse_seed_b64, FamilyError};

pub const INVITE_PREFIX: &str = "bmxt1.";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteV1 {
    pub version: u32,
    pub family_id: String,
    pub seed_b64: String,
    pub from_device_id: String,
    pub from_display_name: String,
}

impl InviteV1 {
    pub fn validate(&self) -> Result<(), FamilyError> {
        if self.version != 1 {
            return Err(FamilyError::InvalidEnvelope);
        }
        if parse_seed_b64(&self.seed_b64).is_none() {
            return Err(FamilyError::InvalidSeed);
        }
        if self.family_id.is_empty()
            || self.from_device_id.is_empty()
            || self.from_display_name.is_empty()
        {
            return Err(FamilyError::InvalidEnvelope);
        }
        Ok(())
    }
}

pub fn format_invite(invite: &InviteV1) -> Result<String, FamilyError> {
    invite.validate()?;
    let json = serde_json::to_string(invite)?;
    Ok(format!(
        "{INVITE_PREFIX}{}",
        bytes_to_base64url(json.as_bytes())
    ))
}

pub fn parse_invite(raw: &str) -> Result<InviteV1, FamilyError> {
    let trimmed: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
    if !trimmed.starts_with(INVITE_PREFIX) {
        return Err(FamilyError::InvalidEnvelope);
    }
    let body = &trimmed[INVITE_PREFIX.len()..];
    let bytes = base64url_to_bytes(body).ok_or(FamilyError::InvalidEnvelope)?;
    let invite: InviteV1 = serde_json::from_slice(&bytes)?;
    invite.validate()?;
    Ok(invite)
}
