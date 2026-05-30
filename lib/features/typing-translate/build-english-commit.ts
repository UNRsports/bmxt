import { translateJaToEn } from "./translator-service"

export type CommitTranslationBlock = {
  source: string
  forward: string
}

/**
 * EN: Build English text for nav typing commit from buffer + completed sentence blocks.
 * JA: 確定送信用に、翻訳済みブロックと未翻訳の末尾を組み立てる。
 */
export async function buildEnglishCommitText(
  buffer: string,
  blocks: readonly CommitTranslationBlock[]
): Promise<string> {
  const trimmed = buffer.trim()
  if (!trimmed) {
    return ""
  }

  const parts: string[] = []
  let searchFrom = 0

  for (const block of blocks) {
    const idx = buffer.indexOf(block.source, searchFrom)
    if (idx < 0) {
      continue
    }
    const gap = buffer.slice(searchFrom, idx).trim()
    if (gap) {
      parts.push(await translateJaToEn(gap))
    }
    const en = block.forward.trim()
    if (en) {
      parts.push(en)
    }
    searchFrom = idx + block.source.length
    while (searchFrom < buffer.length && /\s/.test(buffer[searchFrom]!)) {
      searchFrom++
    }
  }

  const tail = buffer.slice(searchFrom).trim()
  if (tail) {
    parts.push(await translateJaToEn(tail))
  }

  if (parts.length === 0) {
    return translateJaToEn(trimmed)
  }
  return parts.join(" ")
}
