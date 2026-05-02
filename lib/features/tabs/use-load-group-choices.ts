import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"
import { NEW_GROUP_LIST_SENTINEL } from "./tab-picker-overlay-constants"
import type { BulkSubMode, GroupChoice } from "./tab-picker-overlay-types"

export function useLoadGroupChoicesWhenBulkGroup(
  bulkSubMode: BulkSubMode | null,
  setGroupChoices: Dispatch<SetStateAction<GroupChoice[]>>,
  setGroupPickIndex: Dispatch<SetStateAction<number>>
) {
  useEffect(() => {
    if (bulkSubMode !== "group") {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const gs = await chrome.tabGroups.query({})
        if (cancelled) {
          return
        }
        const none = chrome.tabGroups.TAB_GROUP_ID_NONE
        const choices: GroupChoice[] = gs
          .filter((g) => g.id !== undefined && g.id !== none)
          .map((g) => ({
            id: g.id!,
            windowId: g.windowId ?? 0,
            label: `${(g.title || "").trim() || "(無題のグループ)"} · win ${g.windowId ?? "?"}`
          }))
          .sort((a, b) => a.windowId - b.windowId || a.id - b.id)
        choices.unshift({
          id: NEW_GROUP_LIST_SENTINEL,
          windowId: 0,
          label: "＋ 新規グループ（名前・色を指定）"
        })
        setGroupChoices(choices)
        setGroupPickIndex(0)
      } catch {
        if (!cancelled) {
          setGroupChoices([
            {
              id: NEW_GROUP_LIST_SENTINEL,
              windowId: 0,
              label: "＋ 新規グループ（名前・色を指定）"
            }
          ])
          setGroupPickIndex(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bulkSubMode, setGroupChoices, setGroupPickIndex])
}
