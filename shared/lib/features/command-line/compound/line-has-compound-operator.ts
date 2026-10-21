import { lineHasListOperator } from "./parse-compound-segments.ts"
import { lineHasPipeOperator } from "./parse-pipe-segments.ts"

/** EN: True when the line uses `&&` / `||` / `;` and/or `|` at the top level. */
export function lineHasCompoundOperator(line: string): boolean {
  return lineHasListOperator(line) || lineHasPipeOperator(line)
}
