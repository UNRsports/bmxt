import type { ReactNode } from "react"
import { splitTextHighlightSegments } from "../side-picker/search/picker-search-needle"

/** EN: Case-insensitive needle highlight for search picker title / text rows. */
export function SearchPickerHighlight({
  text,
  needle,
  activeOccurrence
}: {
  text: string
  needle: string
  /** EN: When set, only this 0-based occurrence is highlighted (reduces flicker on n/N). */
  activeOccurrence?: number
}): ReactNode {
  const segments = splitTextHighlightSegments(text, needle.trim(), activeOccurrence)
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="bmxt-search-picker-hl">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  )
}
