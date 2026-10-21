import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MutableRefObject
} from "react"
import {
  applyExternalSettingsRecoveryAnswer,
  type ExternalBundleMissingItem,
  type ExternalSettingsRecoveryAnswerResult
} from "./external-settings-startup"
import {
  bootstrapUiSettingsOnWindowLaunch,
  externalSettingsLoadErrorLogLines
} from "./ui-settings-bootstrap"
import { useUiSettings } from "./use-ui-settings"

export type ExternalSettingsRecoveryContextValue = {
  pendingRef: React.MutableRefObject<boolean>
  pending: boolean
  directoryName: string | null
  missing: readonly ExternalBundleMissingItem[]
  announcedRef: React.MutableRefObject<boolean>
  loadErrorLogLines: readonly string[] | null
  loadErrorAnnouncedRef: React.MutableRefObject<boolean>
  submitRecoveryAnswer: (trimmed: string) => Promise<ExternalSettingsRecoveryAnswerResult>
}

const ExternalSettingsRecoveryContext = createContext<ExternalSettingsRecoveryContextValue | null>(
  null
)

export function ExternalSettingsRecoveryProvider({ children }: { children: ReactNode }) {
  const { replaceSettings, reloadSettings } = useUiSettings()
  const pendingRef = useRef(false)
  const announcedRef = useRef(false)
  const loadErrorAnnouncedRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [directoryName, setDirectoryName] = useState<string | null>(null)
  const [missing, setMissing] = useState<ExternalBundleMissingItem[]>([])
  const [loadErrorLogLines, setLoadErrorLogLines] = useState<readonly string[] | null>(null)

  useEffect(() => {
    void bootstrapUiSettingsOnWindowLaunch().then((result) => {
      replaceSettings(result.settings)
      if (result.kind === "needs_recovery") {
        pendingRef.current = true
        setPending(true)
        setDirectoryName(result.directoryName)
        setMissing(result.missing)
        return
      }
      if (result.kind === "load_error") {
        setLoadErrorLogLines(
          externalSettingsLoadErrorLogLines(
            result.settings.locale,
            result.directoryName,
            result.fileName
          )
        )
      }
    })
  }, [replaceSettings])

  const submitRecoveryAnswer = useCallback(
    async (trimmed: string): Promise<ExternalSettingsRecoveryAnswerResult> => {
      const result = await applyExternalSettingsRecoveryAnswer(trimmed, (settings) => {
        replaceSettings(settings)
      })
      if (result.ok) {
        pendingRef.current = false
        setPending(false)
        setMissing([])
        void reloadSettings()
        return result
      }
      if (result.kind === "bundle_incomplete") {
        setDirectoryName(result.directoryName)
        setMissing(result.missing)
      }
      return result
    },
    [reloadSettings, replaceSettings]
  )

  const value = useMemo(
    () => ({
      pendingRef,
      pending,
      directoryName,
      missing,
      announcedRef,
      loadErrorLogLines,
      loadErrorAnnouncedRef,
      submitRecoveryAnswer
    }),
    [directoryName, loadErrorLogLines, missing, pending, submitRecoveryAnswer]
  )

  return (
    <ExternalSettingsRecoveryContext.Provider value={value}>
      {children}
    </ExternalSettingsRecoveryContext.Provider>
  )
}

export function useExternalSettingsRecovery(): ExternalSettingsRecoveryContextValue | null {
  return useContext(ExternalSettingsRecoveryContext)
}
