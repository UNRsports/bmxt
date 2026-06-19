/** EN: SQLite job audit runs in the BMXt tab UI — not in the MV3 service worker. */
export function isJobSqlitePersistenceAvailable(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}
