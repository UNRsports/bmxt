import { memo } from "react"

type Props = {
  lines: readonly string[]
}

/** EN: Isolated log output so prompt / picker updates skip full log reconcile when `lines` is unchanged. */
export const TerminalLogLines = memo(function TerminalLogLines({ lines }: Props) {
  return (
    <>
      {lines.map((ln, i) => (
        <div key={i} className="bmxt-out-line">
          {ln}
        </div>
      ))}
    </>
  )
})
