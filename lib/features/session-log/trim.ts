import { MAX_SESSION_LOG_LINES } from "../extension-storage/keys"

export function trimSessionLogLines(lines: string[]): string[] {
  return lines.slice(-MAX_SESSION_LOG_LINES)
}
