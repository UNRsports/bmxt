import { runCapabilityReportLines } from "../../../capability/run-capability-report.ts"
import { ensureFirefoxHttpsHostGrant } from "../../../extension-permissions/ensure-firefox-https-host-grant.ts"
import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "probe_capabilities" }>

/**
 * EN: Probe usable browser APIs and return terminal log lines (OK/NG markers).
 * JA: 使用可能なブラウザ API を検査しターミナルログ行（OK/NG）を返す。
 */
export async function applyProbeCapabilitiesEffect(
  ctx: DispatchHostContext,
  _e: E
): Promise<string[]> {
  // EN: `aboutbmxt -system` runs under a keypress gesture — restore Firefox hosts first.
  // JA: aboutbmxt -system はキー入力ジェスチャ下。先に Firefox host を戻してから検査する。
  await ensureFirefoxHttpsHostGrant()
  const lines = await runCapabilityReportLines(ctx.uiLocale)
  return [...lines, effectT(ctx, "effect.probeCapabilities.done")]
}
