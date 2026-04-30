//! コマンドのメタデータ（レジストリ行）。`registry::table::COMMANDS` は各 `cmd/*` の `CMD` を集約する。

#[derive(Debug, Clone, Copy)]
pub struct Cmd {
    pub name: &'static str,
    pub aliases: &'static [&'static str],
    pub usage_primary: &'static str,
    pub man: &'static [&'static str],
}
