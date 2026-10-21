/**
 * 組み込みシェルコマンド周りの集約（補完フォールバックなど）。
 * 組み込みコマンドの補完フォールバック。コマンド意味論は Rust/WASM（`lib/wasm/bmxt-core`）。
 */
export { FALLBACK_COMPLETION_CANDIDATES } from "./completion-fallback"
