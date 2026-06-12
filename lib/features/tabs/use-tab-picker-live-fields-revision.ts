import { useSyncExternalStore } from "react"
import {
  getTabPickerLiveTabFieldsRevision,
  subscribeTabPickerLiveTabFields
} from "./tab-picker-live-tab-fields"

/** EN: Re-render when any tab's committed live title/url changes. */
export function useTabPickerLiveFieldsRevision(): number {
  return useSyncExternalStore(
    subscribeTabPickerLiveTabFields,
    getTabPickerLiveTabFieldsRevision,
    getTabPickerLiveTabFieldsRevision
  )
}
