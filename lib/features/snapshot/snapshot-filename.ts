const MAX_SLUG_LEN = 80

function asciiSlugFromTitle(title: string): string {
  const lowered = title.trim().toLowerCase()
  const replaced = lowered.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  if (replaced.length > 0) {
    return replaced.slice(0, MAX_SLUG_LEN)
  }
  return "page"
}

function hostSlugFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
    const slug = host.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    if (slug.length > 0) {
      return slug.slice(0, MAX_SLUG_LEN)
    }
  } catch {
    /* ignore */
  }
  return "page"
}

function datePrefix(savedAt: string): string {
  const d = new Date(savedAt)
  if (Number.isNaN(d.getTime())) {
    return "1970-01-01"
  }
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}

/** EN: Stable, filesystem-safe snapshot file name. */
export function buildSnapshotFileName(title: string, url: string, savedAt: string): string {
  const slug = asciiSlugFromTitle(title)
  const host = hostSlugFromUrl(url)
  const base = slug !== "page" ? slug : host
  return `${datePrefix(savedAt)}-${base}.md`
}

export function uniquifySnapshotFileName(
  fileName: string,
  taken: ReadonlySet<string>
): string {
  if (!taken.has(fileName)) {
    return fileName
  }
  const dot = fileName.lastIndexOf(".")
  const stem = dot >= 0 ? fileName.slice(0, dot) : fileName
  const ext = dot >= 0 ? fileName.slice(dot) : ""
  let n = 2
  while (n < 10_000) {
    const candidate = `${stem}-${n}${ext}`
    if (!taken.has(candidate)) {
      return candidate
    }
    n += 1
  }
  return `${stem}-${Date.now()}${ext}`
}
