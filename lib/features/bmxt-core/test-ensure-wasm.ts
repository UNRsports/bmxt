/**
 * EN: Node test helper — load bmxt-core WASM via initSync (no fetch/file URL).
 * JA: Node テスト用 — fetch せず initSync で bmxt-core WASM を読み込む。
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { ensureBmxtCoreFromBytes, isBmxtCoreReady } from "./wasm-host.ts"

export function ensureBmxtCoreForTests(): void {
  if (isBmxtCoreReady()) {
    return
  }
  const here = dirname(fileURLToPath(import.meta.url))
  const wasmPath = join(here, "../../wasm/bmxt-core/bmxt_core_bg.wasm")
  ensureBmxtCoreFromBytes(new Uint8Array(readFileSync(wasmPath)))
}
