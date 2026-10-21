import type { ReactNode } from "react"
import { tTutorial } from "../setting/i18n/ns/tutorial"
import { useUiLocale } from "../setting/use-ui-settings"
import type { TutorialRuntimeView } from "./types"

type TutorialMessageKey = Parameters<typeof tTutorial>[0]

type Props = {
  view: TutorialRuntimeView
  onSkip: () => void
}

export function TutorialCoachPanel({ view, onSkip }: Props): ReactNode {
  const locale = useUiLocale()
  const stepLabel = tTutorial("tutorial.coach.stepProgress", locale, {
    current: String(view.stepIndex + 1),
    total: String(view.stepCount)
  })
  const titleKey = view.titleKey as TutorialMessageKey
  const instructionKey = view.step.instructionKey as TutorialMessageKey
  const hintKey = view.step.hintKey as TutorialMessageKey | undefined

  return (
    <div className="bmxt-tutorial-coach" role="status" aria-live="polite">
      <div className="bmxt-tutorial-coach-header">
        <div className="bmxt-tutorial-coach-title">
          {tTutorial(titleKey, locale)}
          <span className="bmxt-tutorial-coach-progress">{stepLabel}</span>
        </div>
        <button
          type="button"
          className="bmxt-tutorial-coach-skip"
          onClick={onSkip}
        >
          {tTutorial("tutorial.coach.skip", locale)}
        </button>
      </div>
      <div className="bmxt-tutorial-coach-instruction">
        {tTutorial(instructionKey, locale)}
      </div>
      {hintKey ? (
        <div className="bmxt-tutorial-coach-hint">{tTutorial(hintKey, locale)}</div>
      ) : null}
      <div className="bmxt-tutorial-coach-footer">
        {tTutorial("tutorial.coach.footer", locale)}
      </div>
    </div>
  )
}
