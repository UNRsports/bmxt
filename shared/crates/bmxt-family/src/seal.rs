use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use hkdf::Hkdf;
use rand::RngCore;
use serde::Serialize;
use serde_json::Value;
use sha2::Sha256;
use thiserror::Error;

use crate::b64::{base64url_to_bytes, bytes_to_base64url};
use crate::envelope::{SealKind, SealedEnvelope};

pub const SEED_BYTES: usize = 32;
const IV_BYTES: usize = 12;
const HKDF_INFO: &[u8] = b"bmxt-family-sync-v1";
const MAX_TTL_MS: i64 = 86_400_000;

#[derive(Debug, Error)]
pub enum FamilyError {
    #[error("invalid family seed")]
    InvalidSeed,
    #[error("invalid ttl")]
    InvalidTtl,
    #[error("crypto failure (wrong Family seed, or corrupted ciphertext)")]
    Crypto,
    #[error(
        "invalid envelope (need bare bmxt-rtc1. code, or JSON ticket containing it; multi-line paste must end with an empty line)"
    )]
    InvalidEnvelope,
    #[error(
        "handshake paste looks corrupted (terminal often mangles long bmxt-rtc1. strings). Use a JSON ticket file instead: @/path/to/bmxt-*-answer.json"
    )]
    CorruptedPaste,
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub fn generate_family_seed() -> (String, String) {
    let mut seed = [0u8; SEED_BYTES];
    let mut family_id_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut seed);
    rand::thread_rng().fill_bytes(&mut family_id_bytes);
    (
        bytes_to_base64url(&family_id_bytes),
        bytes_to_base64url(&seed),
    )
}

pub fn parse_seed_b64(seed_b64: &str) -> Option<Vec<u8>> {
    let bytes = base64url_to_bytes(seed_b64)?;
    if bytes.len() != SEED_BYTES {
        return None;
    }
    Some(bytes)
}

fn derive_aes_key(seed: &[u8]) -> Result<Aes256Gcm, FamilyError> {
    let hk = Hkdf::<Sha256>::new(Some(&[]), seed);
    let mut okm = [0u8; 32];
    hk.expand(HKDF_INFO, &mut okm)
        .map_err(|_| FamilyError::Crypto)?;
    Aes256Gcm::new_from_slice(&okm).map_err(|_| FamilyError::Crypto)
}

pub fn seal_json_payload<T: Serialize>(
    family_id: &str,
    seed_b64: &str,
    from_device_id: &str,
    to_device_id: &str,
    kind: SealKind,
    payload: &T,
    ttl_ms: i64,
    now_ms: i64,
) -> Result<SealedEnvelope, FamilyError> {
    let seed = parse_seed_b64(seed_b64).ok_or(FamilyError::InvalidSeed)?;
    if ttl_ms <= 0 || ttl_ms > MAX_TTL_MS {
        return Err(FamilyError::InvalidTtl);
    }
    let key = derive_aes_key(&seed)?;
    let mut iv = [0u8; IV_BYTES];
    rand::thread_rng().fill_bytes(&mut iv);
    let plain = serde_json::to_vec(payload)?;
    let nonce = Nonce::from_slice(&iv);
    let ciphertext = key
        .encrypt(nonce, plain.as_ref())
        .map_err(|_| FamilyError::Crypto)?;
    Ok(SealedEnvelope {
        version: 1,
        family_id: family_id.to_string(),
        from_device_id: from_device_id.to_string(),
        to_device_id: to_device_id.to_string(),
        kind,
        created_at: ms_to_iso(now_ms),
        expires_at: ms_to_iso(now_ms + ttl_ms),
        ciphertext_b64: bytes_to_base64url(&ciphertext),
        iv_b64: bytes_to_base64url(&iv),
    })
}

pub fn unseal_json_payload(envelope: &SealedEnvelope, seed_b64: &str) -> Result<Value, FamilyError> {
    if envelope.version != 1 {
        return Err(FamilyError::InvalidEnvelope);
    }
    let seed = parse_seed_b64(seed_b64).ok_or(FamilyError::InvalidSeed)?;
    let iv = base64url_to_bytes(&envelope.iv_b64).ok_or(FamilyError::InvalidEnvelope)?;
    let cipher = base64url_to_bytes(&envelope.ciphertext_b64).ok_or(FamilyError::InvalidEnvelope)?;
    if iv.len() != IV_BYTES {
        return Err(FamilyError::InvalidEnvelope);
    }
    let key = derive_aes_key(&seed)?;
    let nonce = Nonce::from_slice(&iv);
    let plain = key
        .decrypt(nonce, cipher.as_ref())
        .map_err(|_| FamilyError::Crypto)?;
    let value: Value = serde_json::from_slice(&plain)?;
    Ok(value)
}

pub fn is_envelope_expired(envelope: &SealedEnvelope, now_ms: i64) -> bool {
    match chrono_parse_ms(&envelope.expires_at) {
        Some(exp) => exp <= now_ms,
        None => true,
    }
}

fn ms_to_iso(ms: i64) -> String {
    // EN: Match JS Date.toISOString() for whole milliseconds.
    let secs = ms.div_euclid(1000);
    let millis = ms.rem_euclid(1000) as u32;
    let datetime = time_secs_to_parts(secs);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        datetime.0, datetime.1, datetime.2, datetime.3, datetime.4, datetime.5, millis
    )
}

fn chrono_parse_ms(iso: &str) -> Option<i64> {
    // EN: Accept the ISO strings we emit (…Z with optional millis).
    let trimmed = iso.trim();
    if !trimmed.ends_with('Z') {
        return None;
    }
    let body = &trimmed[..trimmed.len() - 1];
    let (date, time) = body.split_once('T')?;
    let mut date_parts = date.split('-');
    let year: i64 = date_parts.next()?.parse().ok()?;
    let month: i64 = date_parts.next()?.parse().ok()?;
    let day: i64 = date_parts.next()?.parse().ok()?;
    let (hms, frac) = match time.split_once('.') {
        Some((hms, frac)) => (hms, Some(frac)),
        None => (time, None),
    };
    let mut time_parts = hms.split(':');
    let hour: i64 = time_parts.next()?.parse().ok()?;
    let minute: i64 = time_parts.next()?.parse().ok()?;
    let second: i64 = time_parts.next()?.parse().ok()?;
    let millis: i64 = match frac {
        Some(f) => {
            let padded = format!("{:0<3}", &f[..f.len().min(3)]);
            padded.parse().ok()?
        }
        None => 0,
    };
    let days = days_from_civil(year, month, day)?;
    let secs = days * 86_400 + hour * 3600 + minute * 60 + second;
    Some(secs * 1000 + millis)
}

fn days_from_civil(y: i64, m: i64, d: i64) -> Option<i64> {
    if m < 1 || m > 12 || d < 1 || d > 31 {
        return None;
    }
    // Howard Hinnant civil_from_days inverse (UTC days since 1970-01-01).
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146_097 + doe - 719_468)
}

fn time_secs_to_parts(secs: i64) -> (i64, u32, u32, u32, u32, u32) {
    let days = secs.div_euclid(86_400);
    let tod = secs.rem_euclid(86_400) as u32;
    let hour = tod / 3600;
    let minute = (tod % 3600) / 60;
    let second = tod % 60;
    let (y, m, d) = civil_from_days(days);
    (y, m, d, hour, minute, second)
}

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m as u32, d as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn roundtrip_seal_unseal() {
        let (family_id, seed) = generate_family_seed();
        let payload = serde_json::json!({ "hello": "world", "n": 1 });
        let env = seal_json_payload(
            &family_id,
            &seed,
            "deviceAAAA",
            "*",
            SealKind::Signal,
            &payload,
            60_000,
            1_700_000_000_000,
        )
        .expect("seal");
        let got = unseal_json_payload(&env, &seed).expect("unseal");
        assert_eq!(got, payload);
        assert!(!is_envelope_expired(&env, 1_700_000_000_000));
        assert!(is_envelope_expired(&env, 1_700_000_000_000 + 60_001));
    }
}
