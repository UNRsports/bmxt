import { lazy, memo, Suspense, type ComponentProps } from "react"

const PickerRailLazy = lazy(async () => {
  const mod = await import("../../side-picker/wrappers/picker-rail")
  return { default: mod.PickerRail }
})

type PickerRailProps = ComponentProps<typeof PickerRailLazy>

/** EN: Code-split picker columns (tabs/search/dom/setting) — loads after first shell paint. */
export const LazyPickerRail = memo(function LazyPickerRail(props: PickerRailProps) {
  return (
    <Suspense fallback={null}>
      <PickerRailLazy {...props} />
    </Suspense>
  )
})
