import { memo, type ReactElement, type ReactNode } from "react"
import { decodeLogLine } from "../command-line/command-output.ts"
import { parseTabRefLogSegments, type TabRefLogMeta } from "../command-line/tab-ref-log.ts"

type Props = {
  lines: string[]
}

function LogTabRef(props: { meta: TabRefLogMeta }): ReactElement {
  const title = props.meta.title.trim() || "(no title)"
  const url = typeof props.meta.url === "string" ? props.meta.url.trim() : ""
  const showUrl = url.length > 0
  const tooltip = showUrl ? `${title}\n${url}` : title
  const className =
    props.meta.appearance === "chip" ? "bmxt-log-tab-chip" : "bmxt-log-tab-plain"
  return (
    <span className={className} title={tooltip}>
      {props.meta.faviconSrc ? (
        <img
          className={
            props.meta.appearance === "chip"
              ? "bmxt-log-tab-chip-favicon"
              : "bmxt-log-tab-plain-favicon"
          }
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
      <span
        className={
          props.meta.appearance === "chip"
            ? "bmxt-log-tab-chip-title"
            : "bmxt-log-tab-plain-title"
        }>
        {title}
      </span>
      {showUrl ? <span className="bmxt-log-tab-chip-url">{url}</span> : null}
    </span>
  )
}

function renderLogLineText(text: string): ReactNode {
  const segments = parseTabRefLogSegments(text)
  if (segments.length === 1 && segments[0]!.kind === "text") {
    return segments[0]!.text
  }
  return segments.map((seg, i) => {
    if (seg.kind === "text") {
      return seg.text.length > 0 ? <span key={i}>{seg.text}</span> : null
    }
    return <LogTabRef key={i} meta={seg.meta} />
  })
}

/** EN: Isolated log output so prompt / picker updates skip full log reconcile when `lines` is unchanged. */
export const TerminalLogLines = memo(function TerminalLogLines({ lines }: Props) {
  return (
    <>
      {lines.map((ln, i) => {
        const { text, channel } = decodeLogLine(ln)
        const className =
          channel === "stderr" ? "bmxt-out-line bmxt-out-line--stderr" : "bmxt-out-line"
        // EN: Empty strings collapse to zero-height divs — keep a visible blank row.
        const displayText = text.length === 0 ? "\u00a0" : text
        return (
          <div key={i} className={className}>
            {renderLogLineText(displayText)}
          </div>
        )
      })}
    </>
  )
})
