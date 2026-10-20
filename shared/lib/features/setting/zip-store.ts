/** EN: Minimal ZIP (STORE / no compression) for settings export/import. */

export type ZipEntry = {
  name: string
  data: Uint8Array
}

const EOCD_SIZE = 22
const LOCAL_HEADER_SIZE = 30
const CENTRAL_HEADER_SIZE = 46

function crc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
}

const CRC32_TABLE = crc32Table()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

function encodeName(name: string): Uint8Array {
  return new TextEncoder().encode(name)
}

/** EN: Build a ZIP archive using STORE method only. */
export function buildZipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const normalized = entries.map((entry) => ({
    name: entry.name.replace(/\\/g, "/"),
    data: entry.data
  }))

  let totalSize = 0
  for (const entry of normalized) {
    const nameBytes = encodeName(entry.name)
    totalSize += LOCAL_HEADER_SIZE + nameBytes.length + entry.data.length
    totalSize += CENTRAL_HEADER_SIZE + nameBytes.length
  }
  totalSize += EOCD_SIZE

  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  const central: { nameBytes: Uint8Array; crc: number; offset: number; size: number }[] = []
  let offset = 0

  for (const entry of normalized) {
    const nameBytes = encodeName(entry.name)
    const crc = crc32(entry.data)
    const localStart = offset

    writeUint32(view, offset, 0x04034b50)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, 0)
    writeUint16(view, offset + 8, 0)
    writeUint16(view, offset + 10, 0)
    writeUint16(view, offset + 12, 0)
    writeUint32(view, offset + 14, crc)
    writeUint32(view, offset + 18, entry.data.length)
    writeUint32(view, offset + 22, entry.data.length)
    writeUint16(view, offset + 26, nameBytes.length)
    writeUint16(view, offset + 28, 0)
    offset += LOCAL_HEADER_SIZE
    out.set(nameBytes, offset)
    offset += nameBytes.length
    out.set(entry.data, offset)
    offset += entry.data.length

    central.push({ nameBytes, crc, offset: localStart, size: entry.data.length })
  }

  const centralStart = offset
  for (const entry of central) {
    writeUint32(view, offset, 0x02014b50)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, 20)
    writeUint16(view, offset + 8, 0)
    writeUint16(view, offset + 10, 0)
    writeUint16(view, offset + 12, 0)
    writeUint16(view, offset + 14, 0)
    writeUint32(view, offset + 16, entry.crc)
    writeUint32(view, offset + 20, entry.size)
    writeUint32(view, offset + 24, entry.size)
    writeUint16(view, offset + 28, entry.nameBytes.length)
    writeUint16(view, offset + 30, 0)
    writeUint16(view, offset + 32, 0)
    writeUint16(view, offset + 34, 0)
    writeUint16(view, offset + 36, 0)
    writeUint32(view, offset + 38, 0)
    writeUint32(view, offset + 42, entry.offset)
    offset += CENTRAL_HEADER_SIZE
    out.set(entry.nameBytes, offset)
    offset += entry.nameBytes.length
  }

  const centralSize = offset - centralStart
  writeUint32(view, offset, 0x06054b50)
  writeUint16(view, offset + 4, 0)
  writeUint16(view, offset + 6, 0)
  writeUint16(view, offset + 8, central.length)
  writeUint16(view, offset + 10, central.length)
  writeUint32(view, offset + 12, centralSize)
  writeUint32(view, offset + 16, centralStart)
  writeUint16(view, offset + 20, 0)

  return out
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

/** EN: Parse a ZIP archive; returns named file payloads (STORE method only). */
export function parseZipArchive(raw: Uint8Array): ZipEntry[] {
  if (raw.length < EOCD_SIZE) {
    throw new Error("zip too small")
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let eocd = -1
  for (let i = raw.length - EOCD_SIZE; i >= 0; i--) {
    if (readUint32(view, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) {
    throw new Error("zip eocd not found")
  }

  const centralCount = readUint16(view, eocd + 10)
  const centralSize = readUint32(view, eocd + 12)
  const centralOffset = readUint32(view, eocd + 16)
  if (centralOffset + centralSize > raw.length) {
    throw new Error("zip central directory out of range")
  }

  const out: ZipEntry[] = []
  let pos = centralOffset
  for (let i = 0; i < centralCount; i++) {
    if (pos + CENTRAL_HEADER_SIZE > raw.length) {
      throw new Error("zip central header truncated")
    }
    if (readUint32(view, pos) !== 0x02014b50) {
      throw new Error("zip invalid central header")
    }
    const method = readUint16(view, pos + 10)
    if (method !== 0) {
      throw new Error("zip compressed entries are not supported")
    }
    const crc = readUint32(view, pos + 16)
    const compSize = readUint32(view, pos + 20)
    const uncompSize = readUint32(view, pos + 24)
    const nameLen = readUint16(view, pos + 28)
    const extraLen = readUint16(view, pos + 30)
    const commentLen = readUint16(view, pos + 32)
    const localOffset = readUint32(view, pos + 42)
    const nameStart = pos + CENTRAL_HEADER_SIZE
    const nameEnd = nameStart + nameLen
    if (nameEnd > raw.length) {
      throw new Error("zip entry name out of range")
    }
    const name = new TextDecoder().decode(raw.subarray(nameStart, nameEnd))
    pos = nameEnd + extraLen + commentLen

    if (localOffset + LOCAL_HEADER_SIZE > raw.length) {
      throw new Error("zip local header out of range")
    }
    if (readUint32(view, localOffset) !== 0x04034b50) {
      throw new Error("zip invalid local header")
    }
    const localNameLen = readUint16(view, localOffset + 26)
    const localExtraLen = readUint16(view, localOffset + 28)
    const dataStart = localOffset + LOCAL_HEADER_SIZE + localNameLen + localExtraLen
    const dataEnd = dataStart + uncompSize
    if (dataEnd > raw.length || compSize !== uncompSize) {
      throw new Error("zip entry data out of range")
    }
    const data = raw.subarray(dataStart, dataEnd)
    if (crc32(data) !== crc) {
      throw new Error(`zip crc mismatch: ${name}`)
    }
    out.push({ name, data: data.slice() })
  }
  return out
}
