type Props = {
  armed: boolean
  active: boolean
  typingMode?: boolean
  tabTitle: string | null
  overlayError?: string | null
}

export function NavStatusBar({
  armed,
  active,
  typingMode = false,
  tabTitle,
  overlayError = null
}: Props) {
  if (!armed) {
    return null
  }
  const tabLabel =
    overlayError !== null && overlayError.length > 0
      ? `${tabTitle ?? "no tab"} — ${overlayError}`
      : (tabTitle ?? "no tab")
  const modeLabel = typingMode ? "typing" : active ? "ON" : "OFF (Alt toggles)"
  return (
    <div className="bmxt-nav-status" role="status" aria-live="polite">
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--label">nav</span>
      <span
        className={`bmxt-nav-status-seg bmxt-nav-status-seg--state${active ? " bmxt-nav-status-seg--on" : ""}`}>
        {modeLabel}
      </span>
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--meta">{tabLabel}</span>
      <span className="bmxt-nav-status-seg bmxt-nav-status-seg--hint">
        {typingMode
          ? "type in page field · Esc cursor · Alt toggle · nav -exit to quit"
          : "↑↓←→ move · Enter click/type · Alt toggle · nav -exit to quit"}
      </span>
    </div>
  )
}
