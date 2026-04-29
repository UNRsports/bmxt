import type { CommandSpec } from "../types"
import { activateCommand } from "./activate"
import { backCommand } from "./back"
import { clearCommand } from "./clear"
import { closeCommand } from "./close"
import { echoCommand } from "./echo"
import { focusCommand } from "./focus"
import { forwardCommand } from "./forward"
import { groupCommand } from "./group"
import { groupsCommand } from "./groups"
import { helpCommand } from "./help"
import { manCommand } from "./man"
import { moveCommand } from "./move"
import { newCommand } from "./new"
import { tabsCommand } from "./tabs"
import { windowsCommand } from "./windows"

export const BUILTIN_COMMANDS: CommandSpec[] = [
  helpCommand,
  manCommand,
  echoCommand,
  clearCommand,
  tabsCommand,
  windowsCommand,
  focusCommand,
  activateCommand,
  closeCommand,
  newCommand,
  backCommand,
  forwardCommand,
  moveCommand,
  groupsCommand,
  groupCommand
]
