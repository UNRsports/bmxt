import { DEFAULT_TRANSLATION_PAIR_ID, type TranslationPairId } from "./translation-pair"
import { translateForward } from "./translator-service"

export type CommitTranslationBlock = {
  source: string
  forward: string
}

/**
 * EN: Build target-language text for nav typing commit from the full-buffer translation block.
 * JA: 全文翻訳ブロックから nav 確定送信用の訳文を返す。
 */
export async function buildEnglishCommitText(
  buffer: string,
  blocks: readonly CommitTranslationBlock[],
  pairId: TranslationPairId = DEFAULT_TRANSLATION_PAIR_ID
): Promise<string> {
  const trimmed = buffer.trim()
  if (!trimmed) {
    return ""
  }

  const block = blocks[0]
  if (block && block.source === buffer && block.forward.trim()) {
    return block.forward.trim()
  }

  return translateForward(pairId, trimmed)
}
