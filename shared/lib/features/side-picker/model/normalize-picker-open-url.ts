import { parseOpenHttpUrl } from "../../url/parse-open-http-url.ts"

/** EN: Picker open URL — http(s) only; bare hostnames get https://. */
export function normalizePickerOpenUrl(raw: string): string | undefined {
  const t = raw.trim()
  if (t === "") {
    return undefined
  }
  const direct = parseOpenHttpUrl(t)
  if (direct !== null) {
    return direct
  }
  if (/^[\w-]+:\/\//.test(t)) {
    return undefined
  }
  return parseOpenHttpUrl(`https://${t}`) ?? undefined
}
