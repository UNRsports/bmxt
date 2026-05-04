import type { ReactNode } from "react"
import type { LayoutNode } from "./types"
import { BmxtPaneShell, type BmxtPaneShellSharedProps } from "./bmxt-pane-shell"

type Props = {
  node: LayoutNode
  paneLogs: Record<string, string[]>
  focusedPaneId: string
  setFocusedPane: (paneId: string) => void
  shell: BmxtPaneShellSharedProps
}

export function SplitLayout({
  node,
  paneLogs,
  focusedPaneId,
  setFocusedPane,
  shell
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0
      }}>
      {renderNode(node, {
        paneLogs,
        focusedPaneId,
        setFocusedPane,
        shell
      })}
    </div>
  )
}

function renderNode(
  node: LayoutNode,
  ctx: Omit<Props, "node">
): ReactNode {
  if (node.type === "leaf") {
    const pid = node.paneId
    return (
      <div
        key={pid}
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden"
        }}>
        <BmxtPaneShell
          paneId={pid}
          isFocused={ctx.focusedPaneId === pid}
          lines={ctx.paneLogs[pid] ?? []}
          onActivatePane={() => ctx.setFocusedPane(pid)}
          {...ctx.shell}
        />
      </div>
    )
  }
  const flexDir = node.dir === "row" ? "column" : "row"
  const flexA = node.ratio
  const flexB = 1 - node.ratio
  return (
    <div
      key={`${flexDir}-${flexA}`}
      style={{
        display: "flex",
        flex: 1,
        flexDirection: flexDir,
        minHeight: 0,
        minWidth: 0
      }}>
      <div
        style={{
          display: "flex",
          flex: flexA,
          flexBasis: 0,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden"
        }}>
        {renderNode(node.a, ctx)}
      </div>
      <div
        style={{
          display: "flex",
          flex: flexB,
          flexBasis: 0,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden"
        }}>
        {renderNode(node.b, ctx)}
      </div>
    </div>
  )
}
