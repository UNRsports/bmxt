/** EN: Shim — moved to handshake/common (shared by clipboard + file transports). */
export {
  RTC_HANDSHAKE_PREFIX,
  RTC_HANDSHAKE_TTL_MS_DEFAULT,
  RTC_HANDSHAKE_TTL_MS_CONNECT,
  compactRtcHandshakeCode,
  formatRtcHandshakeCode,
  parseRtcHandshakeCode,
  type RtcHandshakePlain,
  type RtcHandshakeRole
} from "../handshake/common/rtc-handshake-codec.ts"
