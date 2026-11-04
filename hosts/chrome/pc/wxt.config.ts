/**
 * EN: Chrome PC host package (`pnpm run build:chrome`; verify / CWS path).
 *     Shell: existing popup (`windows.create`). Same model as Chrome SP.
 * JA: Chrome PC ホスト。シェルは既存ポップアップ。Chrome SP と同じモデル。
 */

import { createHostWxtConfig } from "../../create-host-wxt-config"

export default createHostWxtConfig("chrome")
