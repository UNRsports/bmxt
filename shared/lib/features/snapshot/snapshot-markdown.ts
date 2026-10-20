import type { SnapshotSaveInput } from "./snapshot-types"

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseFrontmatterValue(block: string, key: string): string | null {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m")
  const m = re.exec(block)
  if (!m) {
    return null
  }
  const raw = m[1]!.trim()
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw) as string
    } catch {
      return raw.slice(1, -1)
    }
  }
  return raw
}

/** EN: Build Obsidian-friendly Markdown with YAML frontmatter. */
export function buildSnapshotMarkdown(input: SnapshotSaveInput, savedAt: string): string {
  const title = input.title.trim() || "(no title)"
  const url = input.url.trim()
  const body = input.bodyText.trim()
  const lines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `url: ${JSON.stringify(url)}`,
    `savedAt: ${JSON.stringify(savedAt)}`,
    "source: bmxt",
    "---",
    "",
    `# ${title}`,
    ""
  ]
  if (body.length > 0) {
    lines.push(body)
  }
  return lines.join("\n")
}

export function parseSnapshotMarkdownMeta(markdown: string): {
  title: string
  url: string
  savedAt: string
} {
  const m = FRONTMATTER_RE.exec(markdown)
  if (!m) {
    return { title: "", url: "", savedAt: "" }
  }
  const block = m[1]!
  return {
    title: parseFrontmatterValue(block, "title") ?? "",
    url: parseFrontmatterValue(block, "url") ?? "",
    savedAt: parseFrontmatterValue(block, "savedAt") ?? ""
  }
}

export function snapshotMarkdownBodyLines(markdown: string): string[] {
  const withoutFm = markdown.replace(FRONTMATTER_RE, "")
  return withoutFm.split(/\r?\n/)
}
