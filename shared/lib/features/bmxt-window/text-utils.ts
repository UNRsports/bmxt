export { wordBounds } from "../format/word-bounds.ts"

export function matchesForSearch(history: string[], query: string): string[] {
  const newestFirst = [...history].reverse()
  if (!query) {
    return newestFirst
  }
  return newestFirst.filter((ln) => ln.includes(query))
}
