import { useMemo, useState, type ReactNode } from "react"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import { wizardCopyOutbound } from "../handshake/clipboard/wizard-clipboard.ts"
import {
  HandshakeCopyButton,
  HandshakeFileOpenButton,
  HandshakeSaveFileButton
} from "../handshake/file/wizard-file-ui.tsx"
import {
  wizardLoadInviteFile,
  wizardLoadRtcFile,
  wizardSaveOutboundHandshakeFile,
  wizardSaveOutboundInviteFile
} from "../handshake/file/wizard-file.ts"
import {
  cancelSyncWizard,
  closeSyncWizardQuiet,
  wizardChooseFamily,
  wizardChooseRole,
  wizardContinueAfterInvite,
  wizardFinish,
  wizardGoBack,
  wizardSubmitInvite,
  wizardSubmitRtc,
  type SyncWizardLogSink
} from "./sync-wizard-controller.ts"
import { wizardCanGoBack } from "./sync-wizard-nav.ts"
import { useSyncConnectPending, useSyncWizardState } from "./use-sync-wizard.ts"
import type {
  SyncWizardHandshakeTransport,
  SyncWizardState
} from "./sync-wizard-state.ts"
import { patchSyncWizardState, setSyncWizardBanner } from "./sync-wizard-state.ts"

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

function maskTokenText(code: string): string {
  if (code.length === 0) {
    return ""
  }
  return "*".repeat(code.length)
}

function TokenRevealCheckbox(props: {
  locale: UiLocale
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}): ReactNode {
  return (
    <label className="bmxt-sync-wizard-reveal">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => {
          props.onChange(e.target.checked)
        }}
      />
      <span>{tCmd("cmd.sync.wizard.showTokenText", props.locale)}</span>
    </label>
  )
}

function CodeBlock(props: {
  code: string
  locale: UiLocale
  reveal: boolean
}): ReactNode {
  const display = props.reveal ? props.code : maskTokenText(props.code)
  return (
    <pre
      className="bmxt-sync-wizard-code"
      tabIndex={0}
      aria-label={tCmd("cmd.sync.wizard.codeLabel", props.locale)}>
      {display}
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

function TransportChooser(props: {
  locale: UiLocale
  disabled: boolean
}): ReactNode {
  return (
    <>
      <p className="bmxt-sync-wizard-lead">
        {tCmd("cmd.sync.wizard.transport.intro", props.locale)}
      </p>
      <ChoiceButtons
        disabled={props.disabled}
        choices={[
          {
            id: "clipboard",
            label: tCmd("cmd.sync.wizard.transport.choiceClipboard", props.locale),
            onClick: () => {
              patchSyncWizardState({ handshakeTransport: "clipboard" })
            }
          },
          {
            id: "file",
            label: tCmd("cmd.sync.wizard.transport.choiceFile", props.locale),
            onClick: () => {
              patchSyncWizardState({ handshakeTransport: "file" })
            }
          }
        ]}
      />
    </>
  )
}

function ChangeTransportButton(props: {
  locale: UiLocale
  disabled: boolean
}): ReactNode {
  return (
    <button
      type="button"
      className="bmxt-sync-wizard-secondary"
      disabled={props.disabled}
      onClick={() => {
        patchSyncWizardState({ handshakeTransport: null })
      }}>
      {tCmd("cmd.sync.wizard.transport.change", props.locale)}
    </button>
  )
}

function WizardBackButton(props: {
  locale: UiLocale
  disabled: boolean
  onBack: () => void
}): ReactNode {
  return (
    <button
      type="button"
      className="bmxt-sync-wizard-secondary"
      disabled={props.disabled}
      onClick={props.onBack}>
      {tCmd("cmd.sync.wizard.back", props.locale)}
    </button>
  )
}

function isAllAsterisks(text: string): boolean {
  if (text.length === 0) {
    return false
  }
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) !== "*") {
      return false
    }
  }
  return true
}

/**
 * EN: Keep the real token in state; when masked, the textarea shows only `*` glyphs.
 * Paste / replace-all still updates the real value; reveal toggles plain text.
 */
function applyMaskedTextareaInput(previousReal: string, nextDisplay: string): string {
  if (nextDisplay.length === 0) {
    return ""
  }
  if (previousReal.length === 0) {
    return nextDisplay
  }
  const previousMask = maskTokenText(previousReal)
  if (nextDisplay === previousMask) {
    return previousReal
  }
  if (isAllAsterisks(nextDisplay) && nextDisplay.length < previousMask.length) {
    return previousReal.slice(0, nextDisplay.length)
  }
  if (nextDisplay.startsWith(previousMask) && nextDisplay.length > previousMask.length) {
    return previousReal + nextDisplay.slice(previousMask.length)
  }
  if (!isAllAsterisks(nextDisplay)) {
    return nextDisplay
  }
  return previousReal
}

function PasteForm(props: {
  locale: UiLocale
  disabled: boolean
  placeholderKey: "cmd.sync.wizard.pasteInvitePlaceholder" | "cmd.sync.wizard.pasteRtcPlaceholder"
  submitLabel: string
  onSubmit: (value: string) => void
}): ReactNode {
  const [value, setValue] = useState("")
  const [reveal, setReveal] = useState(false)
  const displayValue = reveal ? value : maskTokenText(value)
  return (
    <form
      className="bmxt-sync-wizard-paste"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(value)
      }}>
      <textarea
        className="bmxt-sync-wizard-textarea"
        value={displayValue}
        disabled={props.disabled}
        placeholder={tCmd(props.placeholderKey, props.locale)}
        rows={5}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onPaste={(e) => {
          if (reveal) {
            return
          }
          e.preventDefault()
          const pasted = e.clipboardData.getData("text")
          setValue(pasted)
        }}
        onChange={(e) => {
          if (reveal) {
            setValue(e.target.value)
            return
          }
          setValue(applyMaskedTextareaInput(value, e.target.value))
        }}
      />
      <TokenRevealCheckbox
        locale={props.locale}
        checked={reveal}
        disabled={props.disabled}
        onChange={setReveal}
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

function OutboundClipboardBlock(props: {
  locale: UiLocale
  disabled: boolean
  outbound: string | null
  onCopy: () => void
}): ReactNode {
  const [reveal, setReveal] = useState(false)
  return (
    <>
      {props.outbound !== null ? (
        <CodeBlock code={props.outbound} locale={props.locale} reveal={reveal} />
      ) : null}
      <TokenRevealCheckbox
        locale={props.locale}
        checked={reveal}
        disabled={props.disabled || props.outbound === null}
        onChange={setReveal}
      />
      <div className="bmxt-sync-wizard-actions">
        <HandshakeCopyButton
          locale={props.locale}
          disabled={props.disabled || props.outbound === null}
          onCopy={props.onCopy}
        />
      </div>
    </>
  )
}

function OutboundFileBlock(props: {
  locale: UiLocale
  disabled: boolean
  outbound: string | null
  onSaveFile: () => void
}): ReactNode {
  return (
    <div className="bmxt-sync-wizard-actions">
      <HandshakeSaveFileButton
        locale={props.locale}
        disabled={props.disabled || props.outbound === null}
        onSaveFile={props.onSaveFile}
      />
    </div>
  )
}

function InboundClipboardBlock(props: {
  locale: UiLocale
  disabled: boolean
  placeholderKey: "cmd.sync.wizard.pasteInvitePlaceholder" | "cmd.sync.wizard.pasteRtcPlaceholder"
  submitLabel: string
  onSubmit: (value: string) => void
}): ReactNode {
  return (
    <PasteForm
      locale={props.locale}
      disabled={props.disabled}
      placeholderKey={props.placeholderKey}
      submitLabel={props.submitLabel}
      onSubmit={props.onSubmit}
    />
  )
}

function InboundFileBlock(props: {
  locale: UiLocale
  disabled: boolean
  onText: (text: string) => void
  onReadFailed: () => void
}): ReactNode {
  return (
    <HandshakeFileOpenButton
      locale={props.locale}
      disabled={props.disabled}
      onText={props.onText}
      onReadFailed={props.onReadFailed}
    />
  )
}

function requireTransport(
  transport: SyncWizardHandshakeTransport,
  locale: UiLocale,
  busy: boolean
): ReactNode | null {
  if (transport !== null) {
    return null
  }
  return <TransportChooser locale={locale} disabled={busy} />
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
  const transport = state.handshakeTransport

  const onRtcFileReadFailed = (): void => {
    setSyncWizardBanner(tCmd("cmd.sync.wizard.openFileFailed", locale), "warning")
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
    const chooser = requireTransport(transport, locale, busy)
    if (chooser !== null) {
      body = chooser
    } else if (transport === "clipboard") {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadPasteInvite", locale)}</p>
          <InboundClipboardBlock
            locale={locale}
            disabled={busy}
            placeholderKey="cmd.sync.wizard.pasteInvitePlaceholder"
            submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
            onSubmit={(v) => void wizardSubmitInvite(sink, v)}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    } else {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">
            {tCmd("cmd.sync.wizard.leadOpenInviteFile", locale)}
          </p>
          <InboundFileBlock
            locale={locale}
            disabled={busy}
            onText={(text) => void wizardLoadInviteFile(sink, text)}
            onReadFailed={onRtcFileReadFailed}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    }
  } else if (state.step === "showInvite") {
    const chooser = requireTransport(transport, locale, busy)
    if (chooser !== null) {
      body = chooser
    } else if (transport === "clipboard") {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadCopyInvite", locale)}</p>
          <OutboundClipboardBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
            onCopy={() => void wizardCopyOutbound(sink)}
          />
          <button
            type="button"
            className="bmxt-sync-wizard-primary"
            disabled={busy}
            onClick={() => wizardContinueAfterInvite()}>
            {tCmd("cmd.sync.wizard.continueToRole", locale)}
          </button>
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    } else {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">
            {tCmd("cmd.sync.wizard.leadSaveInviteFile", locale)}
          </p>
          <OutboundFileBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
            onSaveFile={() => {
              wizardSaveOutboundInviteFile(sink)
            }}
          />
          <button
            type="button"
            className="bmxt-sync-wizard-primary"
            disabled={busy}
            onClick={() => wizardContinueAfterInvite()}>
            {tCmd("cmd.sync.wizard.continueToRole", locale)}
          </button>
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    }
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
    const chooser = requireTransport(transport, locale, busy)
    if (chooser !== null) {
      body = chooser
    } else if (transport === "clipboard") {
      const leadCopy =
        state.peerDisplayName !== null
          ? tCmd("cmd.sync.wizard.leadCopyOfferNamed", locale, {
              name: state.peerDisplayName
            })
          : tCmd("cmd.sync.wizard.leadCopyOffer", locale)
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{leadCopy}</p>
          <OutboundClipboardBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
            onCopy={() => void wizardCopyOutbound(sink)}
          />
          <p className="bmxt-sync-wizard-lead bmxt-sync-wizard-lead--follow">
            {tCmd("cmd.sync.wizard.leadPasteAnswer", locale)}
          </p>
          <InboundClipboardBlock
            locale={locale}
            disabled={busy}
            placeholderKey="cmd.sync.wizard.pasteRtcPlaceholder"
            submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
            onSubmit={(v) => void wizardSubmitRtc(sink, v)}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    } else {
      const leadSave =
        state.peerDisplayName !== null
          ? tCmd("cmd.sync.wizard.leadSaveOfferFileNamed", locale, {
              name: state.peerDisplayName
            })
          : tCmd("cmd.sync.wizard.leadSaveOfferFile", locale)
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{leadSave}</p>
          <OutboundFileBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
            onSaveFile={() => {
              wizardSaveOutboundHandshakeFile(sink)
            }}
          />
          <p className="bmxt-sync-wizard-lead bmxt-sync-wizard-lead--follow">
            {tCmd("cmd.sync.wizard.leadOpenAnswerFile", locale)}
          </p>
          <InboundFileBlock
            locale={locale}
            disabled={busy}
            onText={(text) => void wizardLoadRtcFile(sink, text)}
            onReadFailed={onRtcFileReadFailed}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    }
  } else if (state.step === "pasteOffer") {
    const chooser = requireTransport(transport, locale, busy)
    if (chooser !== null) {
      body = chooser
    } else if (transport === "clipboard") {
      const leadPaste =
        state.peerDisplayName !== null
          ? tCmd("cmd.sync.wizard.leadPasteOfferNamed", locale, {
              name: state.peerDisplayName
            })
          : tCmd("cmd.sync.wizard.leadPasteOffer", locale)
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{leadPaste}</p>
          <InboundClipboardBlock
            locale={locale}
            disabled={busy}
            placeholderKey="cmd.sync.wizard.pasteRtcPlaceholder"
            submitLabel={tCmd("cmd.sync.wizard.submit", locale)}
            onSubmit={(v) => void wizardSubmitRtc(sink, v)}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    } else {
      const leadOpen =
        state.peerDisplayName !== null
          ? tCmd("cmd.sync.wizard.leadOpenOfferFileNamed", locale, {
              name: state.peerDisplayName
            })
          : tCmd("cmd.sync.wizard.leadOpenOfferFile", locale)
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{leadOpen}</p>
          <InboundFileBlock
            locale={locale}
            disabled={busy}
            onText={(text) => void wizardLoadRtcFile(sink, text)}
            onReadFailed={onRtcFileReadFailed}
          />
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    }
  } else if (state.step === "showAnswer") {
    const chooser = requireTransport(transport, locale, busy)
    if (chooser !== null) {
      body = chooser
    } else if (transport === "clipboard") {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">{tCmd("cmd.sync.wizard.leadCopyAnswer", locale)}</p>
          <OutboundClipboardBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
            onCopy={() => void wizardCopyOutbound(sink)}
          />
          <button
            type="button"
            className="bmxt-sync-wizard-primary"
            disabled={busy}
            onClick={() => wizardFinish(sink)}>
            {tCmd("cmd.sync.wizard.close", locale)}
          </button>
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    } else {
      body = (
        <>
          <p className="bmxt-sync-wizard-lead">
            {tCmd("cmd.sync.wizard.leadSaveAnswerFile", locale)}
          </p>
          <OutboundFileBlock
            locale={locale}
            disabled={busy}
            outbound={outbound}
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
          <ChangeTransportButton locale={locale} disabled={busy} />
        </>
      )
    }
  } else if (state.step === "done") {
    const doneIsWarning = state.bannerKind === "warning" && state.banner !== null
    body = (
      <>
        <p
          className={
            doneIsWarning
              ? "bmxt-sync-wizard-banner bmxt-sync-wizard-banner--warning"
              : "bmxt-sync-wizard-lead"
          }
          role={doneIsWarning ? "alert" : undefined}>
          {doneIsWarning ? (
            <span className="bmxt-sync-wizard-banner-label">
              {tCmd("cmd.sync.wizard.warningLabel", locale)}
            </span>
          ) : null}
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

  const showBanner = state.banner !== null && state.step !== "done"
  const bannerIsWarning = showBanner && state.bannerKind === "warning"

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
      {showBanner ? (
        <div
          className={
            bannerIsWarning
              ? "bmxt-sync-wizard-banner bmxt-sync-wizard-banner--warning"
              : "bmxt-sync-wizard-banner"
          }
          role={bannerIsWarning ? "alert" : "status"}>
          {bannerIsWarning ? (
            <span className="bmxt-sync-wizard-banner-label">
              {tCmd("cmd.sync.wizard.warningLabel", locale)}
            </span>
          ) : null}
          {state.banner}
        </div>
      ) : null}
      {busy ? (
        <div className="bmxt-sync-wizard-busy" role="status">
          {tCmd("cmd.sync.wizard.busy", locale)}
        </div>
      ) : null}
      <div className="bmxt-sync-wizard-body">
        {body}
        {wizardCanGoBack(state) ? (
          <WizardBackButton
            locale={locale}
            disabled={busy}
            onBack={() => {
              wizardGoBack(sink)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
