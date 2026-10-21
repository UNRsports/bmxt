/** EN: `nav -enter` — arm nav mode in this BMXt pane (overlay toggled with Alt). */
export function parseNavEnterLine(trimmed: string): boolean {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  return (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "nav" &&
    parts[1]!.toLowerCase() === "-enter"
  )
}

/** EN: `nav -exit` — disarm after Alt-off. */
export function parseNavExitLine(trimmed: string): boolean {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  return (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "nav" &&
    parts[1]!.toLowerCase() === "-exit"
  )
}
