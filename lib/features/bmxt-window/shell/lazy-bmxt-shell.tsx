import { lazy, memo, Suspense, type ComponentProps } from "react"

const BmxtShellLazy = lazy(async () => {
  const mod = await import("../bmxt-shell")
  return { default: mod.BmxtShell }
})

type BmxtShellProps = ComponentProps<typeof BmxtShellLazy>

/** EN: Defer heavy per-session shell until after session bar + layout first paint. */
export const LazyBmxtShell = memo(function LazyBmxtShell(props: BmxtShellProps) {
  return (
    <Suspense
      fallback={
        <div className="bmxt-shell-loading" aria-busy="true" aria-label="Loading terminal" />
      }>
      <BmxtShellLazy {...props} />
    </Suspense>
  )
})
