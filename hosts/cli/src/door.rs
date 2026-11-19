//! EN: Loopback HTTP “front door” for Family-sealed auto-handshake (todo §11).
//! JA: Family 封印オート握手用 loopback HTTP 表玄関（todo §11）。

use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use axum::extract::State;
use axum::http::{HeaderValue, Method, StatusCode};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use bmxt_family::{seal_json_payload, SealKind};
use bmxt_peer_rtc::PeerSession;
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

use crate::bus::BusClient;
use crate::config::CliConfig;
use crate::connect::wait_connected_brief;
use crate::handshake;
use crate::msgs::t_cli;

/// EN: Fixed loopback port shared with the extension (CONTRACT / todo §11).
pub const DOOR_PORT: u16 = 17653;

const DOOR_HELLO_TTL_MS: i64 = 60_000;
const DOOR_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>BMXt door</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.45; }
    code { background: #f2f2f2; padding: 0.1em 0.35em; }
  </style>
</head>
<body>
  <h1>BMXt localhost door</h1>
  <p>Family-sealed handshake endpoint for the BMXt extension (loopback only).</p>
  <p>Open the BMXt prompt window in each browser; sealed auto-reconnect uses this door.</p>
  <p>Manual clipboard / file handshake remains available as fallback.</p>
  <p><code>GET /v1/hello</code> · <code>POST /v1/handshake/offer</code></p>
</body>
</html>"#;

#[derive(Clone)]
struct DoorState {
    cfg: CliConfig,
    hub: Arc<BusClient>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DoorHelloBody {
    v: u32,
    kind: &'static str,
    family_id: String,
    device_id: String,
    display_name: String,
    port: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HelloResponse {
    envelope: bmxt_family::SealedEnvelope,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OfferRequest {
    sealed_offer: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AnswerResponse {
    sealed_answer: String,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: String,
}

/**
 * EN: Bind 127.0.0.1 only and serve the sealed door (does not block the REPL).
 * JA: 127.0.0.1 のみ bind し封印玄関を serve（REPL はブロックしない）。
 */
pub async fn spawn_door(cfg: CliConfig, hub: Arc<BusClient>) -> Result<()> {
    cfg.require_family()?;
    let state = DoorState { cfg, hub };
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any)
        .allow_origin(Any);
    let app = Router::new()
        .route("/", get(index_html))
        .route("/v1/hello", get(hello))
        .route("/v1/handshake/offer", post(handshake_offer))
        .layer(cors)
        .with_state(state);
    let addr = SocketAddr::from(([127, 0, 0, 1], DOOR_PORT));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| anyhow!("localhost door bind {addr}: {e}"))?;
    eprintln!(
        "{}",
        t_cli(
            "cmd.cli.door.listening",
            &[("port", &DOOR_PORT.to_string())]
        )
    );
    tokio::spawn(async move {
        if let Err(err) = axum::serve(listener, app).await {
            eprintln!("localhost door stopped: {err}");
        }
    });
    Ok(())
}

async fn index_html() -> Html<&'static str> {
    Html(DOOR_HTML)
}

async fn hello(State(state): State<DoorState>) -> Response {
    let (family_id, seed_b64) = match state.cfg.require_family() {
        Ok(pair) => pair,
        Err(err) => {
            return json_err(StatusCode::SERVICE_UNAVAILABLE, err.to_string());
        }
    };
    let body = DoorHelloBody {
        v: 1,
        kind: "localhost-door",
        family_id: family_id.to_string(),
        device_id: state.cfg.device_id.clone(),
        display_name: state.cfg.display_name.clone(),
        port: DOOR_PORT,
    };
    let now = chrono::Utc::now().timestamp_millis();
    let envelope = match seal_json_payload(
        family_id,
        seed_b64,
        &state.cfg.device_id,
        "*",
        SealKind::Signal,
        &body,
        DOOR_HELLO_TTL_MS,
        now,
    ) {
        Ok(env) => env,
        Err(err) => return json_err(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    };
    (StatusCode::OK, Json(HelloResponse { envelope })).into_response()
}

async fn handshake_offer(
    State(state): State<DoorState>,
    Json(req): Json<OfferRequest>,
) -> Response {
    let sealed_offer = req.sealed_offer.trim();
    if sealed_offer.is_empty() || sealed_offer.len() > 200_000 {
        return json_err(StatusCode::BAD_REQUEST, "invalid sealedOffer".into());
    }
    if let Err(err) = state.cfg.require_family() {
        return json_err(StatusCode::SERVICE_UNAVAILABLE, err.to_string());
    }

    let (session, mut events) = match PeerSession::create("door-peer".into(), None).await {
        Ok(pair) => pair,
        Err(err) => {
            return json_err(StatusCode::INTERNAL_SERVER_ERROR, format!("session: {err}"));
        }
    };
    let accepted = match handshake::accept_offer_code(&state.cfg, &session, sealed_offer).await {
        Ok(a) => a,
        Err(err) => {
            session.close().await;
            // EN: Wrong Family seed / garbage → extension must ignore this door.
            return json_err(StatusCode::UNAUTHORIZED, format!("sealed offer rejected: {err}"));
        }
    };

    if state
        .hub
        .is_connected_to(&accepted.remote_device_id)
        .await
    {
        session.close().await;
        return json_err(
            StatusCode::CONFLICT,
            format!("already connected to {}", accepted.remote_device_id),
        );
    }

    // EN: Return the sealed answer first so the browser can apply it; attach after DC opens.
    let sealed_answer = accepted.answer_code.clone();
    let remote_id = accepted.remote_device_id.clone();
    let remote_name = accepted.remote_display_name.clone();
    let hub = Arc::clone(&state.hub);
    tokio::spawn(async move {
        match wait_connected_brief(&session, &mut events, 45).await {
            Ok(early) => {
                hub.attach_peer(session, events, remote_id.clone(), remote_name.clone(), early)
                    .await;
                eprintln!("localhost door: connected to {remote_name} ({remote_id})");
                eprintln!(
                    "{}",
                    t_cli(
                        "cmd.cli.door.alive",
                        &[("port", &DOOR_PORT.to_string())]
                    )
                );
            }
            Err(err) => {
                eprintln!("localhost door: DataChannel wait failed for {remote_id}: {err}");
                eprintln!(
                    "{}",
                    t_cli(
                        "cmd.cli.door.stillListening",
                        &[("port", &DOOR_PORT.to_string())]
                    )
                );
                session.close().await;
            }
        }
    });

    (
        StatusCode::OK,
        Json(AnswerResponse {
            sealed_answer,
        }),
    )
        .into_response()
}

fn json_err(status: StatusCode, error: String) -> Response {
    let mut res = (status, Json(ErrorBody { error })).into_response();
    res.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    res
}
