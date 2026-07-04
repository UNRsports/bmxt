import { memo } from "react"
import { decodeLogLine } from "../command-line/command-output.ts"

type Props = {
  lines: string[]
}

/** EN: Isolated log output so prompt / picker updates skip full log reconcile when `lines` is unchanged. */
export const TerminalLogLines = memo(function TerminalLogLines({ lines }: Props) {
  return (
    <>
      {lines.map((ln, i) => {
        const { text, channel } = decodeLogLine(ln)
        const className =
          channel === "stderr" ? "bmxt-out-line bmxt-out-line--stderr" : "bmxt-out-line"
        return (
          <div key={i} className={className}>
            {text}
          </div>
        )
      })}
    </>
  )
})
