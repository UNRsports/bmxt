/**
 * EN: Shim — windows capability lives in `host-env` (pc vs sp).
 * JA: シム。windows は host-env（pc / sp）。
 */

export {
  addWindowsLifecycleListeners,
  getAllWindows,
  hasWindowsApi
} from "../host-env/index.ts"
