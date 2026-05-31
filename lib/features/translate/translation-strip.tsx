import type { TranslationTriplet } from "./translator-service"

export type TranslationBlock = TranslationTriplet & { id: number }

const PENDING_TEXT = "…"

type Props = {
  blocks: readonly TranslationBlock[]
  busy: boolean
  statusNote: string | null
  /** EN: Keep the two-section shell visible even before the first translation. */
  alwaysVisible?: boolean
}

function joinField(blocks: readonly TranslationBlock[], field: keyof TranslationTriplet): string {
  return blocks
    .map((b) => b[field])
    .filter((line) => line.length > 0)
    .join("\n")
}

function displayText(value: string, pending: boolean): string {
  if (value) {
    return value
  }
  return pending ? PENDING_TEXT : ""
}

function TranslateSection({
  label,
  text
}: {
  label: string
  text: string
}) {
  return (
    <section className="bmxt-typing-translate-section">
      <div className="bmxt-typing-translate-heading">{label}</div>
      <div className="bmxt-typing-translate-body">{text}</div>
    </section>
  )
}

export function TranslationStrip({
  blocks,
  busy,
  statusNote,
  alwaysVisible = false
}: Props) {
  if (!alwaysVisible && blocks.length === 0 && !busy && !statusNote) {
    return null
  }

  const forward = displayText(joinField(blocks, "forward"), busy)
  const back = displayText(joinField(blocks, "back"), busy)

  return (
    <div className="bmxt-typing-translate" role="region" aria-label="Translation assist">
      {statusNote ? (
        <div className="bmxt-typing-translate-status" role="status">
          {statusNote}
        </div>
      ) : null}
      <TranslateSection label="訳" text={forward} />
      <div className="bmxt-typing-translate-rule" aria-hidden />
      <TranslateSection label="最訳" text={back} />
    </div>
  )
}
