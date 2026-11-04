/**
 * EN: Shim — tabGroups capability lives in `host-env` (pc vs sp).
 * JA: シム。tabGroups は host-env（pc / sp）。
 */

export {
  TAB_GROUP_ID_NONE,
  addTabGroupsChangeListeners,
  hasTabGroupsApi,
  queryTabGroups
} from "../host-env/index.ts"
