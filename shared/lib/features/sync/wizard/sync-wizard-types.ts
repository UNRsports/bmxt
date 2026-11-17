import type { UiLocale } from "../../setting/locale"

export type SyncWizardLogSink = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}
