/**
 * EN: Shim — Android / form-factor detect lives in `host-env`.
 * JA: シム。Android / フォームファクタ判定は host-env。
 */

export {
  detectAndroidPlatform,
  detectAndroidPlatformSync,
  detectCoarsePointerHost
} from "../../host-env/index.ts"
