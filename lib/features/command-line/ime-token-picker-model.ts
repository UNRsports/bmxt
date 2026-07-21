/** EN: Shared IME token picker model (avoids circular imports with resolvers). */

export type ImeTokenTier = "first" | "second" | "third"

export type ImeTokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: ImeTokenTier
}
