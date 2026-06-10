import { COMMANDS, cmdByName } from "./table.gen"

export function buildHelpLines(): string[] {
  const names = [...COMMANDS.map((c) => c.name)].sort()
  const lines = [
    "BMXt - browser command shell",
    "Quick start: type `tabs` and press Enter, then continue with the shown options.",
    "",
    "Built-in commands:"
  ]
  for (const name of names) {
    const cmd = cmdByName(name)
    if (!cmd) continue
    const aliases =
      cmd.aliases.length > 0 ? ` | ${cmd.aliases.join(" | ")}` : ""
    lines.push(`  ${cmd.usagePrimary}${aliases}`)
  }
  lines.push(
    "",
    "tabs (BMXt window / SW):",
    "  tabs              - show available options, then restore prompt to `tabs ` for continuation.",
    "  tabs -list [-u]   - open tab picker (`-u` shows URL rows under each title).",
    "  tabs -exit -list  - close tab picker in this BMXt pane (Esc returns to prompt only).",
    "  tabs -setting -page-active --auto | --manual — tab preview on highlight (saved).",
    "  tabs -nowurl      - print current tab URL from active tab in focused window.",
    "  tabs -moveurl <url> - focus matching URL tab or open a new tab if none match.",
    "  picker `:` mode   - empty Tab/Enter shows dim target-aware commands (tab/window/group).",
    "",
    "split (terminal panes):",
    "  split               - show -col / -row, then restore prompt to `split ` for continuation.",
    "  split -col          - vertical split (new pane beside current).",
    "  split -row          - horizontal split (new pane below current).",
    "  Ctrl+Arrow          - move keyboard focus between panes when more than one is open.",
    "",
    "dom (page view filter on the active target tab):",
    "  dom -list [--html|--react] [<pattern>] — open DOM list picker in this BMXt pane.",
    "  dom -exit -list  - close DOM list picker in this BMXt pane (Esc returns to prompt only).",
    "",
    "translate (Chrome built-in Translator API, ja↔en):",
    "  translate            - show -on / -off / -setting, then restore prompt to `translate ` for continuation.",
    "  translate -on        - enable translation assist (nav typing preview under prompt).",
    "  translate -off       - close editor column and disable assist.",
    "  translate -setting   - then `--ja-en` or `--en-ja` (Tab menu); saves pair to storage.",
    "",
    "setting (global UI — locale and terminal appearance):",
    "  setting              - show -language / -appearance, then restore prompt to `setting ` for continuation.",
    "  setting -language --japanese | --english — UI display language (saved).",
    "  setting -appearance --fg #rrggbb | --bg-color #rrggbb | --size 12px | --font <family> — saved.",
    "  setting -appearance --bg-import — pick PNG/JPEG/WebP background (512 KiB max, stored in extension).",
    "  setting -appearance --bg-clear | --reset — remove background image or restore defaults.",
    "",
    "search (in-memory search; nothing persisted by these commands):",
    "  search              - show available options, then restore prompt to `search ` for continuation.",
    "  search -list [<pattern>] — open search list picker (all scopes; optional --history|--bookmark|--page to narrow).",
    "  search -exit -list  - close search list picker in this BMXt pane (Esc returns to prompt only).",
    "",
    "URL (http/https, typed as a whole line):",
    "  <url>           - new tab",
    "  <url> .         - current tab (active tab in focused window)",
    "  <url> -nw       - new window",
    "",
    "BMXt window keys:",
    "  One terminal view (output then prompt); focus the window to type.",
    "  left/right/home/end  move cursor in the current line.",
    "  Tab  command completion (repeat to cycle matches).",
    "  up/down  command history   Ctrl+R  reverse-i-search (again: older match)",
    "  Enter  run or accept search   Esc  cancel search"
  )
  return lines
}
