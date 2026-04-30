//! コマンドレジストリ: `table` に静的一覧、`api` に解決・help 生成。

pub mod api;
pub mod table;

pub use api::{all_completion_tokens, resolve_canonical};
