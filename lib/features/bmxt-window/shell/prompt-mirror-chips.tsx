import type { ReactElement, ReactNode, RefObject } from "react"
import {
  findNavReloadTabTokenSpans,
  isNavReloadTabBlockFocused,
  type NavReloadTabChipMeta
} from "../../nav/nav-reload-tab-token"

export type PromptMirrorCaretOptions = {
  caretActive: boolean
  cursorMirrorCellRef: RefObject<HTMLSpanElement | null>
  composition: string
}

function renderPlainWithCaret(
  text: string,
  localCursor: number | null,
  caretOpts: PromptMirrorCaretOptions | null,
  keyPrefix: string
): ReactNode[] {
  if (localCursor === null || caretOpts === null) {
    return text.length > 0 ? [text] : []
  }
  const before = text.slice(0, localCursor)
  const cur = text[localCursor] ?? ""
  const after = text.slice(localCursor + 1)
  const nodes: ReactNode[] = []
  if (before.length > 0) {
    nodes.push(before)
  }
  if (caretOpts.composition) {
    nodes.push(
      <span key={`${keyPrefix}-comp`} className="bmxt-prompt-composition">
        {caretOpts.composition}
      </span>
    )
  } else {
    nodes.push(
      <span
        key={`${keyPrefix}-caret`}
        ref={caretOpts.cursorMirrorCellRef}
        className={`bmxt-cursor-cell${cur ? "" : " bmxt-cursor-cell--eol"}${caretOpts.caretActive ? "" : " bmxt-cursor-cell--inactive"}`}>
        {cur || "\u00a0"}
      </span>
    )
  }
  if (after.length > 0) {
    nodes.push(after)
  }
  return nodes
}

function PromptTabChip(props: {
  token: string
  meta: NavReloadTabChipMeta | undefined
  focused: boolean
}): ReactElement {
  const title = (props.meta?.title ?? props.token).trim() || "(no title)"
  const fullLabel = props.meta?.label ?? props.token
  return (
    <span
      className={`bmxt-prompt-chip${props.focused ? " bmxt-prompt-chip--focused" : ""}`}
      title={fullLabel}>
      {props.meta?.faviconSrc ? (
        <img
          className="bmxt-prompt-chip-favicon"
          src={props.meta.faviconSrc}
          alt=""
          width={16}
          height={16}
          decoding="async"
          draggable={false}
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden"
          }}
        />
      ) : null}
      <span className="bmxt-prompt-chip-title">{title}</span>
    </span>
  )
}

function PromptTabChipRow(props: {
  token: string
  meta: NavReloadTabChipMeta | undefined
  focused: boolean
  showCaretAfter: boolean
  caretOpts: PromptMirrorCaretOptions | null
}): ReactElement {
  return (
    <span className="bmxt-prompt-chip-row">
      <PromptTabChip token={props.token} meta={props.meta} focused={props.focused} />
      {props.showCaretAfter && props.caretOpts && !props.caretOpts.composition ? (
        <span
          ref={props.caretOpts.cursorMirrorCellRef}
          className={`bmxt-cursor-cell bmxt-cursor-cell--eol${props.caretOpts.caretActive ? "" : " bmxt-cursor-cell--inactive"}`}>
          {"\u00a0"}
        </span>
      ) : null}
    </span>
  )
}

/**
 * EN: Render the prompt mirror with `#t:<id>` chips — one single-line chip row per tab
 *     (block-per-line) so the float never overflows horizontally.
 */
export function renderPromptMirrorLine(
  line: string,
  cursorPos: number,
  tabMeta: ReadonlyMap<number, NavReloadTabChipMeta> | undefined,
  caretOpts: PromptMirrorCaretOptions
): ReactNode {
  if (line.length === 0 && !caretOpts.composition) {
    return (
      <span
        ref={caretOpts.cursorMirrorCellRef}
        className={`bmxt-cursor-cell bmxt-cursor-cell--eol${caretOpts.caretActive ? "" : " bmxt-cursor-cell--inactive"}`}>
        {"\u00a0"}
      </span>
    )
  }

  const spans = findNavReloadTabTokenSpans(line)
  if (spans.length === 0) {
    return renderPlainWithCaret(line, cursorPos, caretOpts, "plain")
  }

  const leadNodes: ReactNode[] = []
  const chipRows: ReactNode[] = []
  const trailNodes: ReactNode[] = []
  let cursor = 0
  let caretPlaced = false
  const firstChipStart = spans[0]!.start

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!
    if (span.start > cursor) {
      const chunk = line.slice(cursor, span.start)
      const isInterChipGap = i > 0 && /^\s*$/.test(chunk)
      if (!isInterChipGap) {
        if (!caretPlaced && cursorPos >= cursor && cursorPos < span.start) {
          leadNodes.push(...renderPlainWithCaret(chunk, cursorPos - cursor, caretOpts, `t-${cursor}`))
          caretPlaced = true
        } else if (!caretPlaced && cursorPos === span.start) {
          if (chunk.length > 0) {
            leadNodes.push(chunk)
          }
          leadNodes.push(
            <span
              key={`caret-before-chip-${span.start}`}
              ref={caretOpts.cursorMirrorCellRef}
              className={`bmxt-cursor-cell bmxt-cursor-cell--eol${caretOpts.caretActive ? "" : " bmxt-cursor-cell--inactive"}`}>
              {"\u00a0"}
            </span>
          )
          caretPlaced = true
        } else if (chunk.length > 0) {
          if (span.start <= firstChipStart) {
            leadNodes.push(chunk)
          } else {
            trailNodes.push(chunk)
          }
        }
      }
    }

    const focused = isNavReloadTabBlockFocused(line, cursorPos, span)
    const caretAtChipEnd = focused && cursorPos === span.end
    const caretInsideChip = focused && cursorPos > span.start && cursorPos < span.end
    const showCaret = (caretAtChipEnd || caretInsideChip) && !caretPlaced
    chipRows.push(
      <PromptTabChipRow
        key={`chip-row-${span.start}-${span.tabId}`}
        token={span.token}
        meta={tabMeta?.get(span.tabId)}
        focused={focused}
        showCaretAfter={showCaret}
        caretOpts={caretOpts}
      />
    )
    if (showCaret) {
      caretPlaced = true
    }
    cursor = span.end
  }

  if (cursor < line.length) {
    const chunk = line.slice(cursor)
    if (/^\s*$/.test(chunk)) {
      /* EN: Trailing spaces after the last chip — omit in block layout. */
    } else if (!caretPlaced && cursorPos >= cursor) {
      trailNodes.push(...renderPlainWithCaret(chunk, cursorPos - cursor, caretOpts, `t-${cursor}`))
      caretPlaced = true
    } else if (chunk.length > 0) {
      trailNodes.push(chunk)
    }
  }

  if (!caretPlaced) {
    chipRows.push(
      <span key="caret-eol-row" className="bmxt-prompt-chip-row">
        <span
          ref={caretOpts.cursorMirrorCellRef}
          className={`bmxt-cursor-cell bmxt-cursor-cell--eol${caretOpts.caretActive ? "" : " bmxt-cursor-cell--inactive"}`}>
          {"\u00a0"}
        </span>
      </span>
    )
  }

  return (
    <>
      {leadNodes}
      {chipRows.length > 0 ? (
        <span className="bmxt-prompt-chip-stack">{chipRows}</span>
      ) : null}
      {trailNodes}
    </>
  )
}

/**
 * EN: Chip faces only (no caret) — used while IME composition underline is shown.
 */
export function renderPromptMirrorChipsOnly(
  text: string,
  tabMeta: ReadonlyMap<number, NavReloadTabChipMeta> | undefined
): ReactNode {
  if (text.length === 0) {
    return null
  }
  const spans = findNavReloadTabTokenSpans(text)
  if (spans.length === 0) {
    return text
  }
  const leadNodes: ReactNode[] = []
  const chipRows: ReactNode[] = []
  let cursor = 0
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!
    if (span.start > cursor) {
      const chunk = text.slice(cursor, span.start)
      const isInterChipGap = i > 0 && /^\s*$/.test(chunk)
      if (!isInterChipGap && chunk.length > 0) {
        leadNodes.push(chunk)
      }
    }
    chipRows.push(
      <span key={`chip-row-${span.start}-${span.tabId}`} className="bmxt-prompt-chip-row">
        <PromptTabChip
          token={span.token}
          meta={tabMeta?.get(span.tabId)}
          focused={false}
        />
      </span>
    )
    cursor = span.end
  }
  return (
    <>
      {leadNodes}
      {chipRows.length > 0 ? (
        <span className="bmxt-prompt-chip-stack">{chipRows}</span>
      ) : null}
    </>
  )
}
