import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { CompoundLogBlock } from "./format-compound-log.ts"

/** EN: Append a compound log block with stdout / stderr channels. */
export async function appendCompoundLogBlock(
  deps: CommandDispatchDeps,
  block: CompoundLogBlock
): Promise<void> {
  if (block.stdout.length > 0) {
    await deps.appendLogLines(block.stdout, "stdout")
  }
  if (block.stderr.length > 0) {
    await deps.appendLogLines(block.stderr, "stderr")
  }
}
