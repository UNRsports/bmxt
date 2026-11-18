//! EN: Native WebRTC peer session (host ICE, DataChannel label `bmxt-sync`).
//! JA: ネイティブ WebRTC ピアセッション（host ICE、DataChannel 名 `bmxt-sync`）。

mod session;

pub use session::{
    PeerRtcError, PeerSession, PeerSessionEvent, LocalDescriptionBundle, SessionId,
};
