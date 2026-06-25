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
  assessExternalSettingsBundleAtStartup,
  type ExternalSettingsRecoveryAnswerResult
} from "./external-settings-startup"
import { useUiSettings } from "./use-ui-settings"

export type ExternalSettingsRecoveryContextValue = {
  pendingRef: React.MutableRefObject<boolean>
  pending: boolean
  directoryName: string | null
  announcedRef: React.MutableRefObject<boolean>
  submitRecoveryAnswer: (trimmed: string) => Promise<ExternalSettingsRecoveryAnswerResult>
}

const ExternalSettingsRecoveryContext = createContext<ExternalSettingsRecoveryContextValue | null>(
  null
)

export function ExternalSettingsRecoveryProvider({ children }: { children: ReactNode }) {
  const { replaceSettings, reloadSettings } = useUiSettings()
  const pendingRef = useRef(false)
  const announcedRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [directoryName, setDirectoryName] = useState<string | null>(null)

  useEffect(() => {
    void assessExternalSettingsBundleAtStartup().then((assessment) => {
      if (!assessment.needsRecovery) {
        return
      }
      pendingRef.current = true
      setPending(true)
      setDirectoryName(assessment.directoryName)
    })
  }, [])

  const submitRecoveryAnswer = useCallback(
    async (trimmed: string): Promise<ExternalSettingsRecoveryAnswerResult> => {
      const result = await applyExternalSettingsRecoveryAnswer(trimmed, (settings) => {
        replaceSettings(settings)
      })
      if (result.ok) {
        pendingRef.current = false
        setPending(false)
        void reloadSettings()
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
      announcedRef,
      submitRecoveryAnswer
    }),
    [directoryName, pending, submitRecoveryAnswer]
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
