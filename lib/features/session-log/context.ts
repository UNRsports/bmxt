/** EN: True in the MV3 service worker (no `window`). */
export function isSessionLogServiceWorkerContext(): boolean {
  return typeof window === "undefined"
}
