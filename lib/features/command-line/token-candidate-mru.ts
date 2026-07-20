/**
 * EN: MRU order for IME token-candidate menus (all tiers).
 * JA: プロンプト候補メニュー（第一・第二・第三…）の使用順並べ替え。
 */

import {
  COMMAND_SUBCOMMAND_BRANCHES,
  getSubcommandBranches
} from "../builtin-commands/command-subcommands.gen.ts"
import { COMMANDS } from "../bmxt-core/registry/table.gen.ts"
import { TOKEN_CANDIDATE_MRU_KEY } from "../extension-storage/keys.ts"

/** EN: Keep in sync with `PICKER_LIST_PRODUCER_TOKENS` / page-active mode token lists. */
const EXTRA_FIXED_CANDIDATE_TOKENS = [
  "dom",
  "search",
  "session",
  "setting",
  "tabs",
  "--auto",
  "--manual"
] as const

function resolveCanonical(cmd: string): string | null {
  const k = cmd.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name === k) {
      return c.name
    }
    for (const a of c.aliases) {
      if (a.toLowerCase() === k) {
        return c.name
      }
    }
  }
  return null
}

function canonicalCommandNames(): string[] {
  return COMMANDS.map((c) => c.name).sort((a, b) => a.localeCompare(b))
}

export type TokenCandidateMruEntry = {
  /** EN: Preferred spelling of a fixed candidate token (lowercase for names). */
  name: string
  /** EN: unix ms */
  lastUsedAt: number
}

export type TokenCandidateMruStore = {
  version: 1
  entries: TokenCandidateMruEntry[]
}

const MAX_MRU_ENTRIES = 128
const MAX_NAME_LENGTH = 64

let memoryCache: TokenCandidateMruStore | null = null
let loadPromise: Promise<TokenCandidateMruStore> | null = null
let knownTokenSpelling: Map<string, string> | null = null

function emptyStore(): TokenCandidateMruStore {
  return { version: 1, entries: [] }
}

function isValidEntry(raw: unknown): raw is TokenCandidateMruEntry {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as Record<string, unknown>
  return (
    typeof o.name === "string" &&
    o.name.length > 0 &&
    o.name.length <= MAX_NAME_LENGTH &&
    typeof o.lastUsedAt === "number" &&
    Number.isFinite(o.lastUsedAt)
  )
}

export function sanitizeTokenCandidateMruStore(raw: unknown): TokenCandidateMruStore {
  if (!raw || typeof raw !== "object") {
    return emptyStore()
  }
  const o = raw as Record<string, unknown>
  if (o.version !== 1 || !Array.isArray(o.entries)) {
    return emptyStore()
  }
  const entries = o.entries.filter(isValidEntry).slice(0, MAX_MRU_ENTRIES)
  entries.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  return { version: 1, entries }
}

function buildKnownTokenSpelling(): Map<string, string> {
  const map = new Map<string, string>()
  const add = (token: string) => {
    const trimmed = token.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
      return
    }
    const key = trimmed.toLowerCase()
    if (!map.has(key)) {
      map.set(key, trimmed)
    }
  }

  for (const name of canonicalCommandNames()) {
    add(name)
  }
  for (const token of EXTRA_FIXED_CANDIDATE_TOKENS) {
    add(token)
  }
  for (const branches of Object.values(COMMAND_SUBCOMMAND_BRANCHES)) {
    for (const branch of branches) {
      add(branch.head)
      for (const trailing of branch.trailingTokens) {
        add(trailing)
      }
    }
  }
  return map
}

function knownSpellingMap(): Map<string, string> {
  if (!knownTokenSpelling) {
    knownTokenSpelling = buildKnownTokenSpelling()
  }
  return knownTokenSpelling
}

/** EN: Map a raw word to a fixed-candidate spelling, or null if not a menu token. */
export function resolveFixedCandidateToken(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    return null
  }
  const canonical = resolveCanonical(trimmed)
  if (canonical) {
    return canonical
  }
  return knownSpellingMap().get(trimmed.toLowerCase()) ?? null
}

async function readStore(): Promise<TokenCandidateMruStore> {
  if (memoryCache) {
    return memoryCache
  }
  if (loadPromise) {
    return loadPromise
  }
  loadPromise = (async () => {
    try {
      const got = await chrome.storage.local.get(TOKEN_CANDIDATE_MRU_KEY)
      const store = sanitizeTokenCandidateMruStore(got[TOKEN_CANDIDATE_MRU_KEY])
      memoryCache = store
      return store
    } catch {
      memoryCache = emptyStore()
      return memoryCache
    } finally {
      loadPromise = null
    }
  })()
  return loadPromise
}

async function writeStore(store: TokenCandidateMruStore): Promise<void> {
  memoryCache = store
  try {
    await chrome.storage.local.set({ [TOKEN_CANDIDATE_MRU_KEY]: store })
  } catch {
    /* storage unavailable — keep memory */
  }
}

/** EN: Prefetch chrome.storage into the sync memory cache (shell startup). */
export async function ensureTokenCandidateMruLoaded(): Promise<void> {
  await readStore()
}

function mruNamesSynced(): string[] {
  if (!memoryCache) {
    void readStore()
    return []
  }
  return memoryCache.entries.map((e) => e.name)
}

/**
 * EN: Rank candidates — MRU (newest first), then unused A–Z.
 * JA: 候補を並べ替え — 使用済みは新しい順、未使用はアルファベット順。
 */
export function rankTokenCandidates(candidates: readonly string[]): string[] {
  if (candidates.length === 0) {
    return []
  }
  if (candidates.length === 1) {
    return [...candidates]
  }

  const mruNames = mruNamesSynced()
  if (mruNames.length === 0) {
    return [...candidates].sort((a, b) => a.localeCompare(b))
  }

  const remaining = [...candidates]
  const used: string[] = []

  for (const mruName of mruNames) {
    const mruLower = mruName.toLowerCase()
    const exactIdx = remaining.findIndex((c) => c.toLowerCase() === mruLower)
    const idx =
      exactIdx >= 0
        ? exactIdx
        : remaining.findIndex((c) => resolveCanonical(c) === mruLower)
    if (idx < 0) {
      continue
    }
    used.push(remaining[idx]!)
    remaining.splice(idx, 1)
  }

  remaining.sort((a, b) => a.localeCompare(b))
  return [...used, ...remaining]
}

/**
 * EN: Fixed tokens from a submitted line (first then second/third…), preferred spelling.
 * JA: 実行行から固定候補トークンを抽出（第一→第二→…の順、正規つづり）。
 */
export function extractFixedCandidateTokensFromLine(commandLine: string): string[] {
  const trimmed = commandLine.trim()
  if (trimmed.length === 0) {
    return []
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0)
  const out: string[] = []
  const seen = new Set<string>()

  for (const word of words) {
    const preferred = resolveFixedCandidateToken(word)
    if (!preferred) {
      continue
    }
    const key = preferred.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push(preferred)
  }

  // EN: When the first word is a command with subcommands, keep only tokens that
  // belong to that command's fixed vocabulary after the first (avoids recording free text).
  const first = out[0]
  if (first && resolveCanonical(first) === first) {
    const branches = getSubcommandBranches(first)
    if (branches.length > 0) {
      const allowed = new Set<string>()
      allowed.add(first.toLowerCase())
      for (const branch of branches) {
        allowed.add(branch.head.toLowerCase())
        for (const trailing of branch.trailingTokens) {
          allowed.add(trailing.toLowerCase())
        }
      }
      for (const token of EXTRA_FIXED_CANDIDATE_TOKENS) {
        allowed.add(token.toLowerCase())
      }
      return out.filter((t) => allowed.has(t.toLowerCase()))
    }
  }

  return out
}

/**
 * EN: Record fixed tokens from a submitted command line (first token becomes newest).
 */
export function recordTokenCandidatesFromLine(commandLine: string): void {
  const tokens = extractFixedCandidateTokensFromLine(commandLine)
  if (tokens.length === 0) {
    return
  }
  void recordTokenCandidatesUsed(tokens)
}

/**
 * EN: `tokensNewestFirst[0]` becomes the most recently used entry.
 */
export async function recordTokenCandidatesUsed(
  tokensNewestFirst: readonly string[]
): Promise<void> {
  if (tokensNewestFirst.length === 0) {
    return
  }

  const normalized: string[] = []
  const seen = new Set<string>()
  for (const raw of tokensNewestFirst) {
    const preferred = resolveFixedCandidateToken(raw)
    if (!preferred) {
      continue
    }
    const key = preferred.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    normalized.push(preferred)
  }
  if (normalized.length === 0) {
    return
  }

  const store = await readStore()
  const now = Date.now()
  const next: TokenCandidateMruEntry[] = []
  for (let i = 0; i < normalized.length; i++) {
    next.push({ name: normalized[i]!, lastUsedAt: now - i })
  }
  for (const entry of store.entries) {
    if (seen.has(entry.name.toLowerCase())) {
      continue
    }
    next.push(entry)
  }
  await writeStore({ version: 1, entries: next.slice(0, MAX_MRU_ENTRIES) })
}

/** EN: Test helper — clear in-memory cache. */
export function resetTokenCandidateMruMemoryCacheForTests(): void {
  memoryCache = null
  loadPromise = null
}

/** EN: Test helper — seed sync memory without chrome.storage. */
export function seedTokenCandidateMruMemoryForTests(namesNewestFirst: readonly string[]): void {
  const now = Date.now()
  memoryCache = {
    version: 1,
    entries: namesNewestFirst.map((name, index) => ({
      name: name,
      lastUsedAt: now - index
    }))
  }
  loadPromise = null
}
