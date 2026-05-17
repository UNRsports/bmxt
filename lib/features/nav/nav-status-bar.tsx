type Props = {
  armed: boolean
  active: boolean
  tabTitle: string | null
  overlayError?: string | null
}

export function NavStatusBar({ armed, active, tabTitle, overlayError = null }: Props) {
  if (!armed) {
    return null
  }
  const tabLabel =
    overlayError !== null && overlayError.length > 0
      ? `${tabTitle ?? "no tab"} — ${overlayError}`
      : (tabTitle ?? "no tab")
  const modeLabel = active ? "ON" : "OFF (Alt toggles)"
  return (
    <div className="bmxt-nav-status" role="status" aria-live="polite">
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--label">nav</span>
      <span
        className={`bmxt-nav-status-seg bmxt-nav-status-seg--state${active ? " bmxt-nav-status-seg--on" : ""}`}>
        {modeLabel}
      </span>
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--meta">{tabLabel}</span>
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--hint">
        ↑↓←→ move · Enter click · Alt toggle · nav -exit to quit
      </span>
    </div>
  )
}
