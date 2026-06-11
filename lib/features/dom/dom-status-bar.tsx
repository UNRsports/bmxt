import { useUiLocale } from "../setting"

type Props = {
  kind: "lines" | "prompt"
}

/** EN: Detail bar for the dom list picker. */
export function DomStatusBar({ kind }: Props) {
  const locale = useUiLocale()
  const stateLabel = kind === "prompt" ? "prompt" : "list"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-dom">
        dom
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {kind === "prompt"
          ? locale === "ja"
            ? "権限確認"
            : "permission"
          : locale === "ja"
            ? "DOM 一覧"
            : "DOM list"}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {locale === "ja"
          ? "末尾→で選択 · ↑↓ で移動 · ← でプロンプト · → でピッカー"
          : "EOL → focus · ↑↓ move · ← prompt · → picker"}
      </span>
    </div>
  )
}
