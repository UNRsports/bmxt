import { useMemo, type ReactNode } from "react"
import { DOM_HTML_TOKEN_CLASS } from "./dom-html-syntax.ts"
import { tokenizeDomHtmlSnippet } from "./dom-html-tokenize.ts"

export type DomHtmlSnippetViewProps = {
  snippet: string
  /** EN: Optional tree guide prefix (`├ ` etc.) shown before the snippet. */
  guide?: string
}

/** EN: Renders an HTML snippet with markup vs visible-text coloring. */
export function DomHtmlSnippetView({ snippet, guide }: DomHtmlSnippetViewProps): ReactNode {
  const tokens = useMemo(() => tokenizeDomHtmlSnippet(snippet), [snippet])

  return (
    <>
      {guide ? <span className="bmxt-dom-picker-guide">{guide}</span> : null}
      <span className="bmxt-dom-picker-html">
        {tokens.map((token, index) => (
          <span key={index} className={DOM_HTML_TOKEN_CLASS[token.kind]}>
            {token.text}
          </span>
        ))}
      </span>
    </>
  )
}
