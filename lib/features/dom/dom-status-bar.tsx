import { useUiCopy } from "../setting/use-ui-copy"

type DomStatusBarProps = {
  kind: "lines" | "prompt"
}

/** EN: Detail bar for the dom list picker. */
export function DomStatusBar({ kind }: DomStatusBarProps) {
  const uiCopy = useUiCopy()
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
          ? uiCopy.t("modeStatus.dom.permission")
          : uiCopy.t("modeStatus.dom.list")}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {uiCopy.t("modeStatus.dom.hint")}
      </span>
    </div>
  )
}
