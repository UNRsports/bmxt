import { lazy, Suspense, type RefObject } from "react"
import type { BmxtPromptPickerHandle, BmxtPromptPickerIslandProps } from "./bmxt-prompt-picker-island"

export type {
  BmxtPromptPickerHandle,
  BmxtPromptPickerIslandProps
} from "./bmxt-prompt-picker-island"

/** Warm picker island chunk after idle so first Tab is not blocked on parse. */
if (typeof requestIdleCallback === "function") {
  requestIdleCallback(() => {
    void import("./bmxt-prompt-picker-island")
  })
} else {
  queueMicrotask(() => {
    void import("./bmxt-prompt-picker-island")
  })
}

const BmxtPromptPickerIslandLazy = lazy(async () => {
  const mod = await import("./bmxt-prompt-picker-island")
  return { default: mod.BmxtPromptPickerIsland }
})

export function LazyBmxtPromptPickerIsland(
  props: BmxtPromptPickerIslandProps & {
    pickerRef: RefObject<BmxtPromptPickerHandle | null>
  }
) {
  const { pickerRef, ...rest } = props
  return (
    <Suspense fallback={null}>
      <BmxtPromptPickerIslandLazy ref={pickerRef} {...rest} />
    </Suspense>
  )
}
