/** EN: Classify and format DOM picker rows for display. */

export type DomPickerRowKind = "meta" | "notice" | "tree" | "plain"

export type DomTreeTagParts = {
  tag: string
  idPart: string
  classPart: string
  suffix: string
}

/** EN: Leading indent (`"  ".repeat(depth)`) + rest of tree row (react tag or HTML open tag). */
const TREE_LINE_RE = /^(\s*)(\S.*)$/

/** EN: Depth from tree capture (`"  ".repeat(depth) + content`). */
export function parseDomTreeSourceLine(line: string): { depth: number; content: string } | null {
  const m = line.match(TREE_LINE_RE)
  if (!m) {
    return null
  }
  const depth = Math.floor(m[1]!.length / 2)
  return { depth, content: m[2]!.trim() }
}

export function parseDomTreeTagParts(content: string): DomTreeTagParts | null {
  const m = content.match(/^([a-z][a-z0-9-]*)(#[^\s.[\]]+)?(\.[^\s\[]+)?(\s*\[.*])?$/i)
  if (!m) {
    return { tag: content, idPart: "", classPart: "", suffix: "" }
  }
  return {
    tag: m[1] ?? content,
    idPart: m[2] ?? "",
    classPart: m[3] ?? "",
    suffix: (m[4] ?? "").trim()
  }
}

export function domTreeGuideForDepth(depth: number): string {
  if (depth <= 0) {
    return ""
  }
  return `${"│ ".repeat(depth - 1)}├ `
}

export function classifyDomPickerLine(
  line: string,
  index: number,
  headerLineCount: number,
  jumpPaths: readonly (readonly number[] | null)[]
): DomPickerRowKind {
  if (index < headerLineCount) {
    return "meta"
  }
  if (jumpPaths[index] != null) {
    return "tree"
  }
  if (
    line.startsWith("dom -list") ||
    line.startsWith("JA:") ||
    line.startsWith("EN:") ||
    line.startsWith("target:") ||
    line.startsWith("url:") ||
    line.startsWith("detail:")
  ) {
    return "notice"
  }
  return "plain"
}
