//! Tab picker ヘッダー一行（UI は TS でこの文字列のみ描画）。

use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadlineContext {
    #[serde(default)]
    pub bulk_sub_mode: Option<String>,
    #[serde(default = "default_group_phase")]
    pub group_new_phase: String,
    #[serde(default = "default_variant")]
    pub variant: String,
}

fn default_group_phase() -> String {
    "tabs".to_string()
}

fn default_variant() -> String {
    "default".to_string()
}

fn common_parts() -> Vec<&'static str> {
    vec![
        "↑↓ move",
        "Shift+↑↓ range #",
        "Tab #",
        "←→ モード（ウィンドウ行: 閉じる ↔ 新規タブ）",
        "/ search",
        "Ctrl+Shift+↑↓ active preview",
        "Enter confirm",
        "Esc clear # / exit",
    ]
}

pub fn resolve_headline(ctx: HeadlineContext) -> String {
    if ctx.bulk_sub_mode.as_deref() == Some("group") && ctx.group_new_phase == "meta" {
        return "Tab picker — [GROUP] 新規 · 名前・色 · Enter 確定 · Esc でターゲット一覧へ · Tab 名前↔色"
            .to_string();
    }
    if ctx.variant == "groupNew" && ctx.group_new_phase == "meta" {
        return "group new — 名前・色 · Enter 確定 · Esc タブ一覧へ · Tab 名前↔色".to_string();
    }
    if ctx.variant == "groupNew" && ctx.group_new_phase == "tabs" {
        return "group new — ↑↓ ハイライト · Tab で選択 · Enter で名前・色 · / 検索 · Esc".to_string();
    }

    let parts = common_parts().join(" · ");
    match ctx.bulk_sub_mode.as_deref() {
        Some("move") => format!("Tab picker — [MOVE] ↑↓ dest · Enter apply · {parts}"),
        Some("close") => format!("Tab picker — [CLOSE] Enter でウィンドウを閉じる / タブを閉じる · {parts}"),
        Some("newTab") => format!("Tab picker — [NEW TAB] Enter で URL 入力 · {parts}"),
        Some("group") => format!("Tab picker — [GROUP] ↑↓ 既存 or 新規 · Enter · {parts}"),
        Some("newWindow") => format!(
            "Tab picker — [NEW WINDOW] Enter move # tabs to new window · {parts}"
        ),
        _ => format!("Tab picker — {parts}"),
    }
}
