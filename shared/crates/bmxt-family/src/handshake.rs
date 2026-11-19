use serde::{Deserialize, Serialize};

use crate::b64::{base64url_looks_corrupted, base64url_to_bytes, bytes_to_base64url};
use crate::envelope::{SealKind, SealedEnvelope};
use crate::seal::{seal_json_payload, unseal_json_payload, FamilyError};

pub const RTC_HANDSHAKE_PREFIX: &str = "bmxt-rtc1.";
pub const RTC_HANDSHAKE_TTL_MS_DEFAULT: i64 = 30 * 60 * 1000;
pub const RTC_HANDSHAKE_TTL_MS_CONNECT: i64 = 5 * 60 * 1000;

const MAX_CODE_CHARS: usize = 48_000;
const MAX_SDP_CHARS: usize = 32_000;
const MAX_ICE: usize = 64;
const MAX_ICE_ITEM: usize = 4096;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RtcHandshakeRole {
    Offer,
    Answer,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RtcHandshakePlain {
    pub v: u32,
    pub role: RtcHandshakeRole,
    pub session_id: String,
    pub from_device_id: String,
    pub from_display_name: String,
    pub family_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub to_device_id: Option<String>,
    pub sdp: String,
    pub ice: Vec<String>,
}

impl RtcHandshakePlain {
    pub fn validate(&self) -> Result<(), FamilyError> {
        if self.v != 1 {
            return Err(FamilyError::InvalidEnvelope);
        }
        if self.session_id.len() < 8 || self.session_id.len() > 64 {
            return Err(FamilyError::InvalidEnvelope);
        }
        if self.from_device_id.len() < 8 {
            return Err(FamilyError::InvalidEnvelope);
        }
        if self.family_id.len() < 8 {
            return Err(FamilyError::InvalidEnvelope);
        }
        if let Some(to) = &self.to_device_id {
            if to.len() < 8 {
                return Err(FamilyError::InvalidEnvelope);
            }
        }
        if self.sdp.is_empty() || self.sdp.len() > MAX_SDP_CHARS {
            return Err(FamilyError::InvalidEnvelope);
        }
        if self.ice.len() > MAX_ICE {
            return Err(FamilyError::InvalidEnvelope);
        }
        for item in &self.ice {
            if item.is_empty() || item.len() > MAX_ICE_ITEM {
                return Err(FamilyError::InvalidEnvelope);
            }
        }
        Ok(())
    }
}

pub fn compact_rtc_handshake_code(raw: &str) -> String {
    raw.chars().filter(|c| !c.is_whitespace()).collect()
}

/**
 * EN: Extract a bare `bmxt-rtc1.` code from pasted text (bare code or JSON ticket wrapper).
 *     JSON tickets match extension `parseRtcHandshakeFileText` (`code` field).
 * JA: 貼付テキスト（素のコードまたは JSON チケットの `code`）から `bmxt-rtc1.` を取り出す。
 */
pub fn extract_rtc_handshake_code(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with('{') {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Some(code) = value.get("code").and_then(|v| v.as_str()) {
                return normalize_bare_handshake_code(code);
            }
        }
    }
    normalize_bare_handshake_code(trimmed)
}

fn normalize_bare_handshake_code(raw: &str) -> Option<String> {
    let compact = compact_rtc_handshake_code(raw);
    if !compact.starts_with(RTC_HANDSHAKE_PREFIX) {
        // EN: Allow leading junk only when not a JSON object (already handled above).
        let prefix_at = compact.find(RTC_HANDSHAKE_PREFIX)?;
        let code = &compact[prefix_at..];
        // EN: Stop at first non-base64url char after prefix body (guards accidental trailing JSON).
        let body = &code[RTC_HANDSHAKE_PREFIX.len()..];
        let end = body
            .chars()
            .position(|c| !c.is_ascii_alphanumeric() && c != '-' && c != '_')
            .unwrap_or(body.len());
        let code = format!("{RTC_HANDSHAKE_PREFIX}{}", &body[..end]);
        if code.len() < 16 || code.len() > MAX_CODE_CHARS {
            return None;
        }
        return Some(code);
    }
    if compact.len() < 16 || compact.len() > MAX_CODE_CHARS {
        return None;
    }
    Some(compact)
}

pub fn format_rtc_handshake_code(
    family_id: &str,
    seed_b64: &str,
    from_device_id: &str,
    plain: &RtcHandshakePlain,
    to_device_id: Option<&str>,
    ttl_ms: i64,
    now_ms: i64,
) -> Result<String, FamilyError> {
    plain.validate()?;
    let to = to_device_id
        .map(str::to_string)
        .or_else(|| plain.to_device_id.clone())
        .unwrap_or_else(|| "*".to_string());
    let envelope = seal_json_payload(
        family_id,
        seed_b64,
        from_device_id,
        &to,
        SealKind::Signal,
        plain,
        ttl_ms,
        now_ms,
    )?;
    let packed = bytes_to_base64url(serde_json::to_string(&envelope)?.as_bytes());
    let code = format!("{RTC_HANDSHAKE_PREFIX}{packed}");
    if code.len() > MAX_CODE_CHARS {
        return Err(FamilyError::InvalidEnvelope);
    }
    Ok(code)
}

pub fn parse_rtc_handshake_code(
    raw: &str,
    seed_b64: &str,
) -> Result<RtcHandshakePlain, FamilyError> {
    let trimmed = extract_rtc_handshake_code(raw).ok_or(FamilyError::InvalidEnvelope)?;
    if !trimmed.starts_with(RTC_HANDSHAKE_PREFIX) {
        return Err(FamilyError::InvalidEnvelope);
    }
    if trimmed.len() > MAX_CODE_CHARS {
        return Err(FamilyError::InvalidEnvelope);
    }
    let body = &trimmed[RTC_HANDSHAKE_PREFIX.len()..];
    if body.is_empty() {
        return Err(FamilyError::InvalidEnvelope);
    }
    if base64url_looks_corrupted(body) {
        return Err(FamilyError::CorruptedPaste);
    }
    let bytes = base64url_to_bytes(body).ok_or(FamilyError::CorruptedPaste)?;
    let envelope: SealedEnvelope = serde_json::from_slice(&bytes).map_err(|e| {
        // EN: Surface JSON shape problems distinctly from seal failures.
        FamilyError::Json(e)
    })?;
    if envelope.version != 1
        || envelope.family_id.is_empty()
        || envelope.from_device_id.is_empty()
        || envelope.ciphertext_b64.is_empty()
        || envelope.iv_b64.is_empty()
    {
        return Err(FamilyError::InvalidEnvelope);
    }
    let value = unseal_json_payload(&envelope, seed_b64)?;
    let plain: RtcHandshakePlain = serde_json::from_value(value)?;
    plain.validate()?;
    Ok(plain)
}
