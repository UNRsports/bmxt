use bmxt_family::{
    format_invite, parse_invite, parse_rtc_handshake_code, unseal_json_payload, InviteV1,
    SealedEnvelope,
};
use pretty_assertions::assert_eq;
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SealedDoc {
    seed_b64: String,
    envelope: SealedEnvelope,
    plain: Value,
    handshake_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteDoc {
    invite: InviteV1,
    invite_code: String,
}

#[test]
fn unseal_committed_handshake_fixture() {
    let raw = include_str!("fixtures/sealed-handshake.json");
    let doc: SealedDoc = serde_json::from_str(raw).expect("parse sealed fixture");
    let got = unseal_json_payload(&doc.envelope, &doc.seed_b64).expect("unseal");
    assert_eq!(got, doc.plain);

    let plain = parse_rtc_handshake_code(&doc.handshake_code, &doc.seed_b64).expect("parse code");
    assert_eq!(plain.v, 1);
    assert_eq!(
        serde_json::to_value(&plain).expect("plain json"),
        doc.plain
    );

    // EN: JSON ticket wrapper (browser file transport) must also parse.
    let ticket = format!(
        "{{\n  \"v\": 1,\n  \"kind\": \"bmxt-rtc-handshake\",\n  \"role\": \"offer\",\n  \"code\": \"{}\"\n}}\n",
        doc.handshake_code
    );
    let from_ticket =
        parse_rtc_handshake_code(&ticket, &doc.seed_b64).expect("parse ticket wrapper");
    assert_eq!(from_ticket.session_id, plain.session_id);
}

#[test]
fn parse_committed_invite_fixture() {
    let raw = include_str!("fixtures/invite.json");
    let doc: InviteDoc = serde_json::from_str(raw).expect("parse invite fixture");
    let parsed = parse_invite(&doc.invite_code).expect("parse invite");
    assert_eq!(parsed, doc.invite);
    let reformatted = format_invite(&parsed).expect("format");
    let again = parse_invite(&reformatted).expect("reparse");
    assert_eq!(again, doc.invite);
}
