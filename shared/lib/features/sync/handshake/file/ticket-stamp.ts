/**
 * EN: Local timestamp segment for ticket filenames (lexical chrono order): YYYYMMDD-HHMMSS.
 * JA: チケットファイル名用のローカル時刻（辞書順＝時系列）: YYYYMMDD-HHMMSS。
 */
export function formatBmxtTicketStamp(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0")
  const y = now.getFullYear()
  const mo = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const h = pad(now.getHours())
  const mi = pad(now.getMinutes())
  const s = pad(now.getSeconds())
  return `${y}${mo}${d}-${h}${mi}${s}`
}

/** EN: Alias kept for RTC call sites / shims. */
export const formatRtcHandshakeFileStamp = formatBmxtTicketStamp
