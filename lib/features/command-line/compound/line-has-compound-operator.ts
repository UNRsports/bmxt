import { lineHasAndOperator } from "./parse-and-segments.ts"
import { lineHasPipeOperator } from "./parse-pipe-segments.ts"

/** EN: True when the line uses `&&` and/or `|` at the top level. */
export function lineHasCompoundOperator(line: string): boolean {
  return lineHasAndOperator(line) || lineHasPipeOperator(line)
}
