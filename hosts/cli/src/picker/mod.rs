//! EN: CLI Interactive pickers (ratatui) — independent dir mirroring extension `features/picker/`.
//! JA: CLI Interactive picker。拡張 `features/picker/` に倣う独立ディレクトリ。

mod oneshot;
mod peer;
mod tab;
mod terminal;
mod url;

pub use oneshot::pick_labeled_once;
pub use peer::pick_peer;
pub use tab::{pick_tab_once, run_tab_picker, PeerTabRow, PickerRefresh};
pub use url::{run_url_picker, PeerUrlHit, UrlOpenPeer};

// EN: Types available for call sites that need explicit annotations.
#[allow(unused_imports)]
pub use tab::PickerSelection;
#[allow(unused_imports)]
pub use url::UrlPickerSelection;
