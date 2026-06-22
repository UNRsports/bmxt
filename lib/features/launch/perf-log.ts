/** EN: Copy-friendly perf logging (one-line JSON + structured console). */
/** JA: コピーしやすい計測ログ（1 行 JSON + 構造化 console）。 */

export const PERF_LOG_COPY_PREFIX = "[bmxt perf copy]"

export function logPerfSnapshot(tag: string, payload: unknown): void {
  const json = JSON.stringify(payload)
  console.info(`[bmxt perf] ${tag}`, payload)
  console.info(`${PERF_LOG_COPY_PREFIX} ${tag}: ${json}`)
}
