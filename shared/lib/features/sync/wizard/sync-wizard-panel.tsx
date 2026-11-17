import { useMemo, useRef, useState, type ReactNode } from "react"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import {
  cancelSyncWizard,
  closeSyncWizardQuiet,
  wizardChooseFamily,
  wizardChooseRole,
  wizardContinueAfterInvite,
  wizardCopyOutbound,
  wizardFinish,
  wizardLoadRtcFile,
  wizardSaveOutboundHandshakeFile,
  wizardSubmitInvite,
  wizardSubmitRtc,
  type SyncWizardLogSink
} from "./sync-wizard-controller.ts"
import { useSyncConnectPending, useSyncWizardState } from "./use-sync-wizard.ts"
import type { SyncWizardState } from "./sync-wizard-state.ts"
import { patchSyncWizardState } from "./sync-wizard-state.ts"

export type SyncWizardPanelProps = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}

function titleFor(state: SyncWizardState, locale: UiLocale): string {
  if (state.mode === "connect") {
    return tCmd("cmd.sync.wizard.titleConnect", locale)
  }
  return tCmd("cmd.sync.wizard.titleSetup", locale)
}

function CodeBlock(props: { code: string; locale: UiLocale }): ReactNode {
  return (
    <pre className="bmxt-sync-wizard-code" tabIndex={0} aria-label={tCmd("cmd.sync.wizard.codeLabel", props.locale)}>
      {props.code}
    </pre>
  )
}

function ChoiceButtons(props: {
  disabled: boolean
  choices: Array<{ id: string; label: string; onClick: () => void }>
}): ReactNode {
  return (
    <div className="bmxt-sync-wizard-choices">
      {props.choices.map((c) => (
        <button
          key={c.id}
          type="button"
          className="bmxt-sync-wizard-choice"
          disabled={props.disabled}
          onClick={c.onClick}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

function PasteForm(props: {
  locale: UiLocale
  disabled: boolean
  placeholderKey: "cmd.sync.wizard.pasteInvitePlaceholder" | "cmd.sync.wizard.pasteRtcPlaceholder"
  submitLabel: string
  onSubmit: (value: string) => void
}): ReactNode {
  const [value, setValue] = useState("")
  return (
    <form
      className="bmxt-sync-wizard-paste"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(value)
      }}>
      <textarea
        className="bmxt-sync-wizard-textarea"
        value={value}
        disabled={props.disabled}
        placeholder={tCmd(props.placeholderKey, props.locale)}
        rows={5}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="bmxt-sync-wizard-primary"
        disabled={props.disabled || value.trim().length === 0}>
        {props.submitLabel}
      </button>
    </form>
  )
}

function HandshakeOutboundActions(props: {
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

function HandshakeFileOpenButton(props: {
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

export function SyncWizardPanel(props: SyncWizardPanelProps): ReactNode {
  const state = useSyncWizardState()
  const pending = useSyncConnectPending()
  const locale = props.locale
  const sink: SyncWizardLogSink = useMemo(
    () => ({
      locale: props.locale,
      appendLogLines: props.appendLogLines,
      focusPrompt: props.focusPrompt
    }),
    [props.locale, props.appendLogLines, props.focusPrompt]
  )

  if (!state.open) {
    return null
  }

  const busy = state.busy
  const outbound = pending?.outboundCode ?? null

  const onRtcFileReadFailed = (): void => {
    patchSyncWizardState({
      banner: tCmd("cmd.sync.wizard.openFileFailed", locale)
    })
  }

  let body: ReactNode = null

  if (state.step === "family") {
    const choices = [
      {
        id: "create",
        label: tCmd("cmd.sync.wizard.choiceCreateFamily", locale),
        onClick: () => void wizardChooseFamily(sink, "create")
      },
      {
        id: "join",
        label: tCmd("cmd.sync.wizard.choiceJoinFamily", locale),
        onClick: () => void wizardChooseFamily(sink, "join")
      }
    ]
    if (state.hasFamily) {
      choices.push({
        id: "continue",
        label: tCmd("cmd.sync.wizard.choiceContinueFamily", locale),
        onClick: () => void wizardChooseFamily(sink, "continue")
      })
    }
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.setup.family.intro", locale)}</p>
        <ChoiceButtons disabled={busy} choices={choices} />
      </>
    )
  } else if (state.step === "joinInvite") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadPasteInvite", locale)}</p>
        <PasteForm
          locale={locale}
          disabled={busy}
          placeholderKey="cmd.sync.wizard.pasteInvitePlaceholder"
          submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
          onSubmit={(v) => void wizardSubmitInvite(sink, v)}
        />
        <button
          type="button"
          className="bmxt-sync-wizard-secondary"
          disabled={busy}
          onClick={() => void wizardSubmitInvite(sink, "cancel")}>
          {tCmd("cmd.sync.wizard.back", locale)}
        </button>
      </>
    )
  } else if (state.step === "showInvite") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadCopyInvite", locale)}</p>
        {outbound !== null ? <CodeBlock code={outbound} locale={locale} /> : null}
        <button
          type="button"
          className="bmxt-sync-wizard-copy"
          disabled={busy || outbound === null}
          onClick={() => void wizardCopyOutbound(sink)}>
          {tCmd("cmd.sync.connect.copyButton", locale)}
        </button>
        <button
          type="button"
          className="bmxt-sync-wizard-primary"
          disabled={busy}
          onClick={() => wizardContinueAfterInvite()}>
          {tCmd("cmd.sync.wizard.continueToRole", locale)}
        </button>
      </>
    )
  } else if (state.step === "role") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.setup.role.intro", locale)}</p>
        <ChoiceButtons
          disabled={busy}
          choices={[
            {
              id: "offer",
              label: tCmd("cmd.sync.wizard.choiceOffer", locale),
              onClick: () => void wizardChooseRole(sink, "offer")
            },
            {
              id: "answer",
              label: tCmd("cmd.sync.wizard.choiceAnswer", locale),
              onClick: () => void wizardChooseRole(sink, "answer")
            }
          ]}
        />
      </>
    )
  } else if (state.step === "showOffer") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">
          {state.peerDisplayName !== null
            ? tCmd("cmd.sync.wizard.leadCopyOfferNamed", locale, {
                name: state.peerDisplayName
              })
            : tCmd("cmd.sync.wizard.leadCopyOffer", locale)}
        </p>
        {outbound !== null ? <CodeBlock code={outbound} locale={locale} /> : null}
        <HandshakeOutboundActions
          locale={locale}
          disabled={busy || outbound === null}
          onCopy={() => void wizardCopyOutbound(sink)}
          onSaveFile={() => {
            wizardSaveOutboundHandshakeFile(sink)
          }}
        />
        <p className="bmxt-sync-wizard-lead bmxt-sync-wizard-lead--follow">
          {tCmd("cmd.sync.wizard.leadPasteAnswer", locale)}
        </p>
        <HandshakeFileOpenButton
          locale={locale}
          disabled={busy}
          onText={(text) => void wizardLoadRtcFile(sink, text)}
          onReadFailed={onRtcFileReadFailed}
        />
        <PasteForm
          locale={locale}
          disabled={busy}
          placeholderKey="cmd.sync.wizard.pasteRtcPlaceholder"
          submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
          onSubmit={(v) => void wizardSubmitRtc(sink, v)}
        />
      </>
    )
  } else if (state.step === "pasteOffer") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">
          {state.peerDisplayName !== null
            ? tCmd("cmd.sync.wizard.leadPasteOfferNamed", locale, {
                name: state.peerDisplayName
              })
            : tCmd("cmd.sync.wizard.leadPasteOffer", locale)}
        </p>
        <HandshakeFileOpenButton
          locale={locale}
          disabled={busy}
          onText={(text) => void wizardLoadRtcFile(sink, text)}
          onReadFailed={onRtcFileReadFailed}
        />
        <PasteForm
          locale={locale}
          disabled={busy}
          placeholderKey="cmd.sync.wizard.pasteRtcPlaceholder"
          submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
          onSubmit={(v) => void wizardSubmitRtc(sink, v)}
        />
      </>
    )
  } else if (state.step === "showAnswer") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadCopyAnswer", locale)}</p>
        {outbound !== null ? <CodeBlock code={outbound} locale={locale} /> : null}
        <HandshakeOutboundActions
          locale={locale}
          disabled={busy || outbound === null}
          onCopy={() => void wizardCopyOutbound(sink)}
          onSaveFile={() => {
            wizardSaveOutboundHandshakeFile(sink)
          }}
        />
        <button
          type="button"
          className="bmxt-sync-wizard-primary"
          disabled={busy}
          onClick={() => wizardFinish(sink)}>
          {tCmd("cmd.sync.wizard.close", locale)}
        </button>
      </>
    )
  } else if (state.step === "done") {
    body = (
      <>
        <p className="bmxt-sync-wizard-lead">
          {state.banner ?? tCmd("cmd.sync.setup.done", locale)}
        </p>
        <button
          type="button"
          className="bmxt-sync-wizard-primary"
          onClick={() => wizardFinish(sink)}>
          {tCmd("cmd.sync.wizard.close", locale)}
        </button>
      </>
    )
  }

  return (
    <div
      className="bmxt-sync-wizard"
      role="dialog"
      aria-modal="false"
      aria-label={titleFor(state, locale)}>
      <div className="bmxt-sync-wizard-header">
        <div className="bmxt-sync-wizard-title">{titleFor(state, locale)}</div>
        <button
          type="button"
          className="bmxt-sync-wizard-cancel"
          disabled={busy && state.step !== "done"}
          onClick={() => {
            if (state.step === "done") {
              closeSyncWizardQuiet(sink)
              return
            }
            cancelSyncWizard(sink)
          }}>
          {state.step === "done"
            ? tCmd("cmd.sync.wizard.close", locale)
            : tCmd("cmd.sync.wizard.cancel", locale)}
        </button>
      </div>
      {state.banner !== null && state.step !== "done" ? (
        <div className="bmxt-sync-wizard-banner" role="status">
          {state.banner}
        </div>
      ) : null}
      {busy ? (
        <div className="bmxt-sync-wizard-busy" role="status">
          {tCmd("cmd.sync.wizard.busy", locale)}
        </div>
      ) : null}
      <div className="bmxt-sync-wizard-body">{body}</div>
    </div>
  )
}
