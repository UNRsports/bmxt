//! EN: Family auth (sealed envelope) / invite / RTC connection codes shared with the extension contract.
//! JA: 拡張契約と共有する Family 認証（sealed envelope）・招待・RTC 接続コード。

mod b64;
mod envelope;
mod handshake;
mod invite;
mod seal;

pub use b64::{base64url_looks_corrupted, base64url_to_bytes, bytes_to_base64url};
pub use envelope::{SealedEnvelope, SealKind};
pub use handshake::{
    compact_rtc_handshake_code, extract_rtc_handshake_code, format_rtc_handshake_code,
    parse_rtc_handshake_code, RtcHandshakePlain, RtcHandshakeRole, RTC_HANDSHAKE_PREFIX,
    RTC_HANDSHAKE_TTL_MS_CONNECT, RTC_HANDSHAKE_TTL_MS_DEFAULT,
};
pub use invite::{format_invite, parse_invite, InviteV1, INVITE_PREFIX};
pub use seal::{
    generate_family_seed, is_envelope_expired, parse_seed_b64, seal_json_payload,
    unseal_json_payload, FamilyError, SEED_BYTES,
};
