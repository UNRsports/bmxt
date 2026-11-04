/**
 * EN: Shim — tab preview activation lives in `host-env` (popup vs tab shell).
 * JA: シム。タブプレビュー活性化は host-env（popup / tab）。
 */

export { activateTabInBackground } from "../../host-env/index.ts"
