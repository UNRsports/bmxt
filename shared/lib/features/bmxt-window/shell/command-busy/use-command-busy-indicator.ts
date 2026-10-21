import { useCallback, useEffect, useRef, useState } from "react"
import {
  COMMAND_BUSY_DELAY_MS,
  COMMAND_BUSY_FRAME_MS,
  type CommandBusyProgress,
  type CommandBusyToken,
  formatCommandBusyLabel,
  shouldShowCommandBusy
} from "./command-busy.ts"

export type CommandBusyIndicatorApi = {
  /** EN: True while a busy session is active (even before the delay). */
  isCommandBusy: boolean
  /** EN: True after the delay — braille frames are active on the busy label. */
  showCommandBusy: boolean
  /** EN: Busy status line (`⠋ Searching…  [██░░░░░░░░] 2/4`). */
  commandBusyLabel: string
  beginCommandBusy: (message: string) => CommandBusyToken
  updateCommandBusyMessage: (token: CommandBusyToken, message: string) => void
  updateCommandBusyProgress: (token: CommandBusyToken, progress: CommandBusyProgress) => void
  endCommandBusy: (token?: CommandBusyToken) => void
  /** EN: False after cancel / supersede / end for this token. */
  isBusyTokenActive: (token: CommandBusyToken) => boolean
}

/**
 * EN: Prompt busy indicator — locked input + optional determinate overall progress.
 * JA: プロンプト上ビジー — 入力ロック＋任意の全体進捗（分数／バー）。
 */
export function useCommandBusyIndicator(): CommandBusyIndicatorApi {
  const nextIdRef = useRef(1)
  const activeIdRef = useRef(0)
  const messageRef = useRef("")
  const progressRef = useRef<CommandBusyProgress>({ kind: "indeterminate" })
  const startedAtRef = useRef(0)
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isCommandBusy, setIsCommandBusy] = useState(false)
  const [showCommandBusy, setShowCommandBusy] = useState(false)
  const [commandBusyLabel, setCommandBusyLabel] = useState("")

  const clearTimers = useCallback(() => {
    if (delayTimerRef.current !== null) {
      clearTimeout(delayTimerRef.current)
      delayTimerRef.current = null
    }
    if (frameTimerRef.current !== null) {
      clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
  }, [])

  const refreshLabel = useCallback(() => {
    if (activeIdRef.current === 0) {
      setCommandBusyLabel("")
      return
    }
    const elapsed = Date.now() - startedAtRef.current
    const animate = shouldShowCommandBusy(elapsed)
    setCommandBusyLabel(
      formatCommandBusyLabel(elapsed, messageRef.current, progressRef.current, animate)
    )
  }, [])

  const startFrameLoop = useCallback(() => {
    if (frameTimerRef.current !== null) {
      return
    }
    refreshLabel()
    frameTimerRef.current = setInterval(() => {
      refreshLabel()
    }, COMMAND_BUSY_FRAME_MS)
  }, [refreshLabel])

  const endCommandBusy = useCallback(
    (token?: CommandBusyToken) => {
      if (token !== undefined && token.id !== activeIdRef.current) {
        return
      }
      activeIdRef.current = 0
      messageRef.current = ""
      progressRef.current = { kind: "indeterminate" }
      startedAtRef.current = 0
      clearTimers()
      setIsCommandBusy(false)
      setShowCommandBusy(false)
      setCommandBusyLabel("")
    },
    [clearTimers]
  )

  const beginCommandBusy = useCallback(
    (message: string): CommandBusyToken => {
      clearTimers()
      const id = nextIdRef.current
      nextIdRef.current += 1
      activeIdRef.current = id
      messageRef.current = message
      progressRef.current = { kind: "indeterminate" }
      startedAtRef.current = Date.now()
      setIsCommandBusy(true)
      setShowCommandBusy(false)
      setCommandBusyLabel(formatCommandBusyLabel(0, message, progressRef.current, false))

      delayTimerRef.current = setTimeout(() => {
        delayTimerRef.current = null
        if (activeIdRef.current !== id) {
          return
        }
        setShowCommandBusy(true)
        startFrameLoop()
      }, COMMAND_BUSY_DELAY_MS)

      return { id }
    },
    [clearTimers, startFrameLoop]
  )

  const updateCommandBusyMessage = useCallback(
    (token: CommandBusyToken, message: string) => {
      if (token.id !== activeIdRef.current) {
        return
      }
      messageRef.current = message
      refreshLabel()
    },
    [refreshLabel]
  )

  const updateCommandBusyProgress = useCallback(
    (token: CommandBusyToken, progress: CommandBusyProgress) => {
      if (token.id !== activeIdRef.current) {
        return
      }
      progressRef.current = progress
      refreshLabel()
    },
    [refreshLabel]
  )

  const isBusyTokenActive = useCallback((token: CommandBusyToken): boolean => {
    return token.id === activeIdRef.current && activeIdRef.current !== 0
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return {
    isCommandBusy,
    showCommandBusy,
    commandBusyLabel,
    beginCommandBusy,
    updateCommandBusyMessage,
    updateCommandBusyProgress,
    endCommandBusy,
    isBusyTokenActive
  }
}
