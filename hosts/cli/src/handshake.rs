use anyhow::{anyhow, Result};
use bmxt_family::{
    format_invite, format_rtc_handshake_code, parse_invite, parse_rtc_handshake_code, InviteV1,
    RtcHandshakePlain, RtcHandshakeRole, RTC_HANDSHAKE_TTL_MS_DEFAULT,
};
use bmxt_peer_rtc::{LocalDescriptionBundle, PeerSession};

use crate::config::CliConfig;

pub struct AppliedAnswer {
    pub remote_device_id: String,
    pub remote_display_name: String,
}

pub struct AcceptedOffer {
    pub answer_code: String,
    pub remote_device_id: String,
    pub remote_display_name: String,
}

pub fn print_invite(cfg: &CliConfig) -> Result<String> {
    let (family_id, seed_b64) = cfg.require_family()?;
    let invite = InviteV1 {
        version: 1,
        family_id: family_id.to_string(),
        seed_b64: seed_b64.to_string(),
        from_device_id: cfg.device_id.clone(),
        from_display_name: cfg.display_name.clone(),
    };
    format_invite(&invite).map_err(|e| anyhow!(e))
}

pub fn apply_invite(cfg: &mut CliConfig, raw: &str) -> Result<()> {
    let invite = parse_invite(raw).map_err(|e| anyhow!(e))?;
    cfg.join_family(invite.family_id, invite.seed_b64)?;
    Ok(())
}

pub async fn make_offer_code(
    cfg: &CliConfig,
    session: &PeerSession,
) -> Result<(String, LocalDescriptionBundle)> {
    let (family_id, seed_b64) = cfg.require_family()?;
    let bundle = session.create_offer().await?;
    // EN: Omit addressee so any Family member can answer (envelope toDeviceId = "*").
    let plain = RtcHandshakePlain {
        v: 1,
        role: RtcHandshakeRole::Offer,
        session_id: session.session_id.clone(),
        from_device_id: cfg.device_id.clone(),
        from_display_name: cfg.display_name.clone(),
        family_id: family_id.to_string(),
        to_device_id: None,
        sdp: bundle.sdp.clone(),
        ice: bundle.ice.clone(),
    };
    let now = chrono::Utc::now().timestamp_millis();
    let code = format_rtc_handshake_code(
        family_id,
        seed_b64,
        &cfg.device_id,
        &plain,
        Some("*"),
        RTC_HANDSHAKE_TTL_MS_DEFAULT,
        now,
    )
    .map_err(|e| anyhow!(e))?;
    Ok((code, bundle))
}

pub async fn accept_offer_code(
    cfg: &CliConfig,
    session: &PeerSession,
    code: &str,
) -> Result<AcceptedOffer> {
    let (family_id, seed_b64) = cfg.require_family()?;
    let plain = parse_rtc_handshake_code(code, seed_b64).map_err(|e| anyhow!(e))?;
    if plain.role != RtcHandshakeRole::Offer {
        return Err(anyhow!("expected offer handshake code"));
    }
    let bundle = session.accept_offer(&plain.sdp, &plain.ice).await?;
    let answer_plain = RtcHandshakePlain {
        v: 1,
        role: RtcHandshakeRole::Answer,
        session_id: plain.session_id,
        from_device_id: cfg.device_id.clone(),
        from_display_name: cfg.display_name.clone(),
        family_id: family_id.to_string(),
        to_device_id: Some(plain.from_device_id.clone()),
        sdp: bundle.sdp,
        ice: bundle.ice,
    };
    let now = chrono::Utc::now().timestamp_millis();
    let answer_code = format_rtc_handshake_code(
        family_id,
        seed_b64,
        &cfg.device_id,
        &answer_plain,
        Some(&plain.from_device_id),
        RTC_HANDSHAKE_TTL_MS_DEFAULT,
        now,
    )
    .map_err(|e| anyhow!(e))?;
    Ok(AcceptedOffer {
        answer_code,
        remote_device_id: plain.from_device_id,
        remote_display_name: plain.from_display_name,
    })
}

pub async fn apply_answer_code(
    cfg: &CliConfig,
    session: &PeerSession,
    code: &str,
) -> Result<AppliedAnswer> {
    let (_family_id, seed_b64) = cfg.require_family()?;
    let plain = parse_rtc_handshake_code(code, seed_b64).map_err(|e| anyhow!(e))?;
    if plain.role != RtcHandshakeRole::Answer {
        return Err(anyhow!("expected answer handshake code"));
    }
    session.apply_answer(&plain.sdp, &plain.ice).await?;
    Ok(AppliedAnswer {
        remote_device_id: plain.from_device_id,
        remote_display_name: plain.from_display_name,
    })
}
