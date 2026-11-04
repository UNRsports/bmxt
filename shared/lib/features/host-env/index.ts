/**
 * EN: Host environment — browser × form-factor × shell mode.
 *     Product matrix: Chrome PC/SP + Firefox PC → popup; Firefox SP → tab only.
 * JA: ホスト環境。Chrome PC/SP・Firefox PC は popup。特例は Firefox SP のタブのみ。
 */

export type { HostBrowserId } from "./resolve-browser.ts"
export { isFirefoxOrigin, resolveHostBrowser } from "./resolve-browser.ts"

export type { HostFormFactor } from "./resolve-form-factor.ts"
export {
  detectAndroidPlatform,
  detectAndroidPlatformSync,
  detectCoarsePointerHost,
  resolveFormFactor,
  resolveFormFactorAsync
} from "./resolve-form-factor.ts"

export type { HostShellMode } from "./resolve-shell-mode.ts"
export { resolveShellMode, usesTabShell } from "./resolve-shell-mode.ts"

export {
  addWindowsLifecycleListeners,
  getAllWindows,
  hasWindowsApi
} from "./windows-api.ts"

export { getCommandsOnCommand, hasCommandsApi } from "./commands-api.ts"

export {
  TAB_GROUP_ID_NONE,
  addTabGroupsChangeListeners,
  hasTabGroupsApi,
  queryTabGroups
} from "./tab-groups-api.ts"

export {
  addMirrorWindowFocusListener,
  getLastFocusedWindowOrNull,
  getNormalWindowOrNull,
  type MirrorFocusHandler
} from "./mirror-window-focus.ts"

export { activateTabInBackground } from "./activate-tab-preview.ts"
