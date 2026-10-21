/**
 * EN: Convert between JS string offsets (UTF-16 code units) and Rust `&str` offsets (UTF-8 bytes).
 * JA: JS の文字列オフセット（UTF-16）と Rust `&str`（UTF-8 バイト）の相互変換。
 */

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** EN: UTF-16 index → UTF-8 byte offset (clamped; always a char boundary). */
export function utf16OffsetToUtf8ByteOffset(text: string, utf16Offset: number): number {
  const clamped = Math.max(0, Math.min(Math.floor(utf16Offset), text.length))
  return textEncoder.encode(text.slice(0, clamped)).length
}

/** EN: UTF-8 byte offset → UTF-16 index (floors to prior char boundary when mid-sequence). */
export function utf8ByteOffsetToUtf16Offset(text: string, utf8ByteOffset: number): number {
  const bytes = textEncoder.encode(text)
  let end = Math.max(0, Math.min(Math.floor(utf8ByteOffset), bytes.length))
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) {
    end -= 1
  }
  return textDecoder.decode(bytes.subarray(0, end)).length
}
