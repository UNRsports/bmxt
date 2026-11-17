import { useRef, type ReactNode } from "react"
import { tCmd } from "../../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../../setting/locale"

export function HandshakeFileOpenButton(props: {
  locale: UiLocale
  disabled: boolean
  onText: (text: string) => void
  onReadFailed: () => void
}): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        className="bmxt-sync-wizard-file-input"
        type="file"
        accept="application/json,.json,text/plain,.txt"
        tabIndex={-1}
        disabled={props.disabled}
        onChange={(e) => {
          const input = e.currentTarget
          const file = input.files?.[0]
          input.value = ""
          if (file === undefined) {
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result !== "string") {
              props.onReadFailed()
              return
            }
            props.onText(reader.result)
          }
          reader.onerror = () => {
            props.onReadFailed()
          }
          reader.readAsText(file)
        }}
      />
      <button
        type="button"
        className="bmxt-sync-wizard-secondary"
        disabled={props.disabled}
        onClick={() => {
          inputRef.current?.click()
        }}>
        {tCmd("cmd.sync.wizard.openFileButton", props.locale)}
      </button>
    </>
  )
}

export function HandshakeOutboundActions(props: {
  locale: UiLocale
  disabled: boolean
  onCopy: () => void
  onSaveFile: () => void
}): ReactNode {
  return (
    <div className="bmxt-sync-wizard-actions">
      <button
        type="button"
        className="bmxt-sync-wizard-copy"
        disabled={props.disabled}
        onClick={props.onCopy}>
        {tCmd("cmd.sync.connect.copyButton", props.locale)}
      </button>
      <button
        type="button"
        className="bmxt-sync-wizard-secondary"
        disabled={props.disabled}
        onClick={props.onSaveFile}>
        {tCmd("cmd.sync.wizard.saveFileButton", props.locale)}
      </button>
    </div>
  )
}
