export function matchesForSearch(history: string[], query: string): string[] {
  const newestFirst = [...history].reverse()
  if (!query) {
    return newestFirst
  }
  return newestFirst.filter((ln) => ln.includes(query))
}

export function wordBounds(s: string, pos: number): [number, number] {
  let l = pos
  while (l > 0 && !/\s/.test(s[l - 1]!)) {
    l--
  }
  let r = pos
  while (r < s.length && !/\s/.test(s[r]!)) {
    r++
  }
  return [l, r]
}
