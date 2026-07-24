/**
 * EN: Parse WASM JSON. Wire failures are `{ error: string }` without an `ok` field.
 * Domain results may include `error` alongside `ok` (e.g. create-group plan) and must not throw.
 * JA: WASM JSON をパースする。ワイヤ失敗は `ok` なしの `{ error: string }`。
 * ドメイン結果は `ok` と並んで `error` を持ち得るため throw しない。
 */

export function parseWasmJson<T>(raw: string): T {
  const parsed: unknown = JSON.parse(raw)
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    "error" in parsed &&
    !("ok" in parsed)
  ) {
    const errorValue = (parsed as { error: unknown }).error
    if (typeof errorValue === "string" && errorValue.length > 0) {
      throw new Error(errorValue)
    }
  }
  return parsed as T
}
