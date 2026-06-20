import { lazy, Suspense, type ComponentProps } from "react"
import type { TranslationPairId } from "../../translate/translation-pair"

const TranslationStripLazy = lazy(async () => {
  const mod = await import("../../translate/translation-strip")
  return { default: mod.TranslationStrip }
})

type Props = ComponentProps<typeof TranslationStripLazy> & {
  pairId: TranslationPairId
}

/** EN: Nav typing translation preview — deferred until nav typing + translate are active. */
export function LazyTranslationStrip(props: Props) {
  return (
    <Suspense fallback={null}>
      <TranslationStripLazy {...props} />
    </Suspense>
  )
}
