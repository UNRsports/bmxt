import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"

export type CompoundDepsWrap = {
  deps: CommandDispatchDeps
  capturedLines: string[]
}

/** EN: Suppress per-segment `> …` echoes while still applying side effects. */
export function wrapCompoundDeps(deps: CommandDispatchDeps): CompoundDepsWrap {
  const capturedLines: string[] = []
  const wrapped: CommandDispatchDeps = {
    ...deps,
    appendLogLines: async (lines: string[]) => {
      for (const line of lines) {
        if (!line.startsWith("> ")) {
          capturedLines.push(line)
        }
      }
    }
  }
  return { deps: wrapped, capturedLines }
}

export function drainCapturedLines(wrap: CompoundDepsWrap): string[] {
  return [...wrap.capturedLines]
}

export function resetCapturedLines(wrap: CompoundDepsWrap): void {
  wrap.capturedLines.length = 0
}
