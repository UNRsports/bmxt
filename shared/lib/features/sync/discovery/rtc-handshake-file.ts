/** EN: Shim — moved to handshake/file (ticket-file transport). */
export {
  RTC_HANDSHAKE_FILE_KIND,
  RTC_HANDSHAKE_FILE_VERSION,
  buildRtcHandshakeFileDocument,
  buildRtcHandshakeFileJson,
  downloadRtcHandshakeFile,
  formatRtcHandshakeFileStamp,
  parseRtcHandshakeFileText,
  rtcHandshakeFileName,
  type RtcHandshakeFileDocument,
  type RtcHandshakeFileParseResult,
  type RtcHandshakeFileRole
} from "../handshake/file/rtc-handshake-file.ts"
