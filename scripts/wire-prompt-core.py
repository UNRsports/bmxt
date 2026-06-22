#!/usr/bin/env python3
"""Wire useShellPromptCore into bmxt-shell.tsx."""
from pathlib import Path

SHELL = Path("lib/features/bmxt-window/bmxt-shell.tsx")
lines = SHELL.read_text(encoding="utf-8").splitlines(keepends=True)

# Fix broken empty imports from prior script
text = "".join(lines)
text = text.replace(
    'import { promptMirrorSegments } from "../nav/nav-prompt-input"\n',
    "",
)
text = text.replace(
    "import { matchesForSearch } from \"./text-utils\"\n",
    "",
)
text = text.replace(
    "import {\n  ensureBmxtCore,\n  FALLBACK_COMPLETION_CANDIDATES,\n  getCompletionCandidates\n} from \"../bmxt-core\"\n",
    "",
)
text = text.replace(
    "import {\n} from \"./csp-dynamic-stylesheet\"\n",
    "",
)
text = text.replace(
    "import {\n} from \"./shell/bmxt-shell-prompt-helpers\"\n",
    "",
)

if "useShellPromptCore" not in text:
    text = text.replace(
        'import { useShellKeyboard } from "./shell/useShellKeyboard"',
        'import { useShellKeyboard } from "./shell/useShellKeyboard"\nimport { useShellPromptCore } from "./shell/useShellPromptCore"',
    )

# Move useNavMode block to after useShellPromptCore insertion point
nav_start = text.index("  const {\n    currentTabTitle: navCurrentTabTitle")
nav_end = text.index("  const navTextSelDone = navTextSelPhase === \"done\"")
nav_block = text[nav_start:nav_end]
text = text[:nav_start] + text[nav_end:]

# Remove inline prompt state block (mode through textarea layout effect)
block_start = text.index("  const [mode, setMode] = useState<\"normal\" | \"isearch\">(\"normal\")")
block_end = text.index("  const {\n    subCmdPicker,")
text = text[:block_start] + text[block_end:]

# Insert prompt core + log scroll + nav after session display name ref block ends
# Find anchor: after currentSessionDisplayNameRef assignment, before useSearchListShell or subCmdPicker
anchor = "  currentSessionDisplayNameRef.current = currentSessionDisplayName\n\n"
insert = '''  currentSessionDisplayNameRef.current = currentSessionDisplayName

  const {
    mode,
    setMode,
    line,
    setLine,
    cursorPos,
    setCursorPos,
    isComposing,
    setIsComposing,
    compositionAnchor,
    setCompositionAnchor,
    localCompletion,
    histNavIndex,
    setHistNavIndex,
    histDraft,
    setHistDraft,
    skipHistResetRef,
    iSearchCycle,
    setISearchCycle,
    iSearchSnapshot,
    setISearchSnapshot,
    iSearchMatches,
    iSearchPreview,
    tabPressSeqRef,
    lineRef,
    cursorRef,
    navPromptSnapRef,
    completionCandidatesRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    cursorMirrorCellRef,
    subCmdPickerHostRef,
    mirror,
    promptLine
  } = useShellPromptCore({ history, completionCandidates })

  const { scrollRef, logScrollable, syncLogScroll } = useLogScroll({
    lines,
    mode,
    line,
    postUpgradeBanner
  })

''' + nav_block + "\n"

if "useShellPromptCore({" not in text:
    if anchor not in text:
        raise SystemExit("anchor not found")
    text = text.replace(anchor, insert, 1)

# Remove duplicate useLogScroll if still present before useSentenceTranslate
dup = '''  const { scrollRef, logScrollable, syncLogScroll } = useLogScroll({
    lines,
    mode,
    line,
    postUpgradeBanner
  })
  const [isComposing, setIsComposing] = useState(false)
  const [compositionAnchor, setCompositionAnchor] = useState(0)
  const [localCompletion, setLocalCompletion] = useState<string[]>(completionCandidates)

'''
if dup in text:
    text = text.replace(dup, "")

# Remove orphaned state/effects after useSentenceTranslate block cleanup
orphan_blocks = [
    '''  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)

  const [histNavIndex, setHistNavIndex] = useState(-1)
  const [histDraft, setHistDraft] = useState("")
  const skipHistResetRef = useRef(false)

  const [iSearchCycle, setISearchCycle] = useState(0)
  const [iSearchSnapshot, setISearchSnapshot] = useState("")

  const tabPressSeqRef = useRef(0)
  const lineRef = useRef("")
  const cursorRef = useRef(0)
  const navPromptSnapRef = useRef<{ line: string; cursor: number } | null>(null)
  const completionCandidatesRef = useRef<string[]>([])
  /** EN: Tab on empty line opened the first-command menu — keep showing until input/Esc/submit. */

  useEffect(() => {
    setLocalCompletion(completionCandidates)
  }, [completionCandidates])

  useEffect(() => {
    completionCandidatesRef.current = localCompletion
  }, [localCompletion])

  useEffect(() => {
    lineRef.current = line
  }, [line])

  useEffect(() => {
    cursorRef.current = cursorPos
  }, [cursorPos])


  useEffect(() => {
    void (async () => {
      try {
        await ensureBmxtCore()
        setLocalCompletion(getCompletionCandidates())
      } catch {
        setLocalCompletion(FALLBACK_COMPLETION_CANDIDATES)
      }
    })()
  }, [])

  const iSearchMatches = useMemo(
    () => matchesForSearch(history, mode === "isearch" ? line : ""),
    [history, line, mode]
  )



  useEffect(() => {
    if (iSearchCycle >= iSearchMatches.length && iSearchMatches.length > 0) {
      setISearchCycle(0)
    }
    if (iSearchMatches.length === 0) {
      setISearchCycle(0)
    }
  }, [iSearchMatches.length, iSearchCycle, iSearchMatches])

  useLayoutEffect(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [line, cursorPos, isComposing])

''',
    '''  const mirror = promptMirrorSegments(line, cursorPos, isComposing, compositionAnchor)
  const iSearchPreview = iSearchMatches[iSearchCycle]
''',
]
for block in orphan_blocks:
    text = text.replace(block, "")

# Remove duplicate promptLine if exists
dup_prompt = '''  const promptLine = useCallback(
    () => imeRef.current?.value ?? lineRef.current,
    []
  )

'''
text = text.replace(dup_prompt, "")

# Remove useLayoutEffect from imports if unused
if "useLayoutEffect" not in text.replace("import {", "import {"):
    pass
if "useLayoutEffect" not in text.split("import {", 1)[1].split("} from \"react\"")[0]:
    text = text.replace("  useLayoutEffect,\n", "")

SHELL.write_text(text, encoding="utf-8")
print(f"Patched {SHELL}")
