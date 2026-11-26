//! EN: Thin demo entry — Interactive pickers live in `crate::picker`.
//! JA: デモ入口のみ。Interactive picker 本体は `crate::picker`。

use anyhow::Result;

pub fn run_demo_tui() -> Result<()> {
    println!("Open a live session with `bmxt sync-connect`, then `tab -list --peers | browse`.");
    Ok(())
}
