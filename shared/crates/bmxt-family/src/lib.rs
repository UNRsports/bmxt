//! EN: Family seal / invite / RTC handshake codes shared with the extension contract.
//! JA: 拡張契約と共有する Family 封印・招待・RTC 握手コード。

mod b64;
mod envelope;
mod handshake;
mod invite;
mod seal;

pub use b64::{bytes_to_base64url, base64url_to_bytes};
pub use envelope::{SealedEnvelope, SealKind};
pub use handshake::{
    compact_rtc_handshake_code, format_rtc_handshake_code, parse_rtc_handshake_code,
    RtcHandshakePlain, RtcHandshakeRole, RTC_HANDSHAKE_PREFIX, RTC_HANDSHAKE_TTL_MS_CONNECT,
    RTC_HANDSHAKE_TTL_MS_DEFAULT,
};
pub use invite::{format_invite, parse_invite, InviteV1, INVITE_PREFIX};
pub use seal::{
    generate_family_seed, is_envelope_expired, parse_seed_b64, seal_json_payload,
    unseal_json_payload, FamilyError, SEED_BYTES,
};
