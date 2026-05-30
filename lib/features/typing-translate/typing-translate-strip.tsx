import type { TranslationTriplet } from "./translator-service"

export type TypingTranslateBlock = TranslationTriplet & { id: number }

type Props = {
  blocks: readonly TypingTranslateBlock[]
  busy: boolean
  statusNote: string | null
}

export function TypingTranslateStrip({ blocks, busy, statusNote }: Props) {
  if (blocks.length === 0 && !busy && !statusNote) {
    return null
  }
  return (
    <div className="bmxt-typing-translate" role="region" aria-label="Translation assist">
      {statusNote ? (
        <div className="bmxt-typing-translate-status" role="status">
          {statusNote}
        </div>
      ) : null}
      {busy ? (
        <div className="bmxt-typing-translate-status" role="status">
          translating…
        </div>
      ) : null}
      {blocks.map((b) => (
        <div key={b.id} className="bmxt-typing-translate-block">
          <div className="bmxt-typing-translate-line">
            <span className="bmxt-typing-translate-label">原文</span>
            <span className="bmxt-typing-translate-text">{b.source}</span>
          </div>
          <div className="bmxt-typing-translate-line">
            <span className="bmxt-typing-translate-label">EN</span>
            <span className="bmxt-typing-translate-text">{b.forward}</span>
          </div>
          <div className="bmxt-typing-translate-line">
            <span className="bmxt-typing-translate-label">再訳</span>
            <span className="bmxt-typing-translate-text">{b.back}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
