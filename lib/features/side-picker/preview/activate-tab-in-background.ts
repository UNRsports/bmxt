import { markPickerSelfTabActivation } from "./picker-self-tab-activation"

/** EN: Activate a tab without focusing its window (picker background preview). */
export async function activateTabInBackground(tabId: number): Promise<boolean> {
  try {
    markPickerSelfTabActivation(tabId)
    await chrome.tabs.update(tabId, { active: true })
    return true
  } catch {
    return false
  }
}
