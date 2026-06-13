import { useUiLocale } from "../setting"
import { searchStatusHint } from "../setting/i18n/resolvers"

type Props = {
  pattern?: string
  phase?: "loading" | "results"
}

/** EN: Detail bar for the search list picker. */
export function SearchStatusBar({ pattern, phase }: Props) {
  const locale = useUiLocale()
  const stateLabel = phase === "loading" ? "loading" : "list"
  const meta =
    pattern && pattern.length > 0
      ? pattern.length > 48
        ? `${pattern.slice(0, 48)}…`
        : pattern
      : locale === "ja"
        ? "（パターンなし）"
        : "(no pattern)"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-search">
        search
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{meta}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {searchStatusHint(locale)}
      </span>
    </div>
  )
}
