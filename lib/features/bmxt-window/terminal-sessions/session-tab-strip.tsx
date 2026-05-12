import type { CSSProperties } from "react"

type Props = {
  order: string[]
  activeId: string
  onSelect: (sessionId: string) => void
  onAdd: () => void
  onClose: (sessionId: string) => void
}

const tabBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  border: "1px solid #30363d",
  borderRadius: 6,
  background: "#161b22",
  color: "#8b949e",
  fontSize: 11,
  cursor: "pointer",
  maxWidth: 140,
  minWidth: 0
}

export function SessionTabStrip({ order, activeId, onSelect, onAdd, onClose }: Props) {
  return (
    <div
      role="tablist"
      style={{
        position: "relative",
        zIndex: 30,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderBottom: "1px solid #21262d",
        background: "#0d1117",
        flexShrink: 0
      }}>
      {order.map((id, i) => {
        const isActive = id === activeId
        const label = `ターミナル ${i + 1}`
        return (
          <div
            key={id}
            role="tab"
            aria-selected={isActive}
            style={{
              ...tabBase,
              borderColor: isActive ? "#58a6ff" : "#30363d",
              background: isActive ? "#1c2128" : "#161b22",
              color: isActive ? "#c9d1d9" : "#8b949e"
            }}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              style={{
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                font: "inherit"
              }}
              title={label}>
              {label}
            </button>
            {order.length > 1 ? (
              <button
                type="button"
                aria-label={`${label} を閉じる`}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(id)
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#8b949e",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: 14,
                  lineHeight: 1
                }}>
                ×
              </button>
            ) : null}
          </div>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        title="ターミナルを追加"
        style={{
          ...tabBase,
          flex: "0 0 auto",
          maxWidth: "none",
          justifyContent: "center",
          minWidth: 32
        }}>
        +
      </button>
    </div>
  )
}
