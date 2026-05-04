import { allPaneIds, removePane, splitLeaf } from "./layout-ops"
import {
  loadOrMigrateSplitSession,
  newPaneId,
  saveSplitSession
} from "./storage"
import type { SplitDir, SplitSessionV1 } from "./types"

export async function applySplitDirection(
  paneId: string,
  dir: SplitDir
): Promise<string[]> {
  const session = await loadOrMigrateSplitSession()
  const newId = newPaneId()
  const nextRoot = splitLeaf(session.root, paneId, dir, newId)
  if (!nextRoot) {
    return ["(split: 対象ペインが見つかりません)"]
  }
  const next: SplitSessionV1 = {
    ...session,
    root: nextRoot,
    paneLogs: { ...session.paneLogs, [newId]: [] },
    focusedPaneId: newId
  }
  await saveSplitSession(next)
  return [
    dir === "row"
      ? "(split-row: 下に新しいペインを追加しました)"
      : "(split-col: 右に新しいペインを追加しました)"
  ]
}

/** 複数ペインが残るときのみペイン削除。呼び出し側で pane 数を確認すること。 */
export async function removePaneFromSession(paneId: string): Promise<void> {
  const session = await loadOrMigrateSplitSession()
  const nextRoot = removePane(session.root, paneId)
  if (!nextRoot) {
    return
  }
  const nextLogs = { ...session.paneLogs }
  delete nextLogs[paneId]
  const ids = allPaneIds(nextRoot)
  let focus = session.focusedPaneId
  if (focus === paneId || !ids.includes(focus)) {
    focus = ids[0]!
  }
  await saveSplitSession({
    v: 1,
    root: nextRoot,
    paneLogs: nextLogs,
    focusedPaneId: focus
  })
}

export async function paneCount(): Promise<number> {
  const session = await loadOrMigrateSplitSession()
  return allPaneIds(session.root).length
}
