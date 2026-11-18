//! EN: Native WebRTC peer session (host ICE, DataChannel label `bmxt-sync`).
//! JA: ネイティブ WebRTC ピアセッション（host ICE、DataChannel 名 `bmxt-sync`）。

mod session;

pub use session::{
    LocalDescriptionBundle, PeerRtcError, PeerSession, PeerSessionEvent, SessionId,
};
