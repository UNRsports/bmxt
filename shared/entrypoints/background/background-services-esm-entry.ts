/**
 * EN: ESM entry that exposes the same global as the IIFE (`importScripts`) build.
 *     Used on Firefox MV3 background pages where `importScripts` is undefined.
 * JA: IIFE（importScripts）と同じ global を公開する ESM 入口。
 *     Firefox MV3 の background（importScripts なし）向け。
 */

import * as services from "./background-services"

const BACKGROUND_SERVICES_GLOBAL = "BmxtBackgroundServices"

;(globalThis as Record<string, unknown>)[BACKGROUND_SERVICES_GLOBAL] = services

export default services
