/** EN: Warm fire gradient by heat (0..1) and alpha. */
export function fireHeatColor(heat: number, alpha: number): string {
  const t = Math.max(0, Math.min(1, heat))
  if (t > 0.66) {
    const u = (t - 0.66) / 0.34
    const r = 255
    const g = Math.round(220 + 35 * (1 - u))
    const b = Math.round(120 * (1 - u))
    return `rgba(${r},${g},${b},${alpha})`
  }
  if (t > 0.33) {
    const u = (t - 0.33) / 0.33
    const r = 255
    const g = Math.round(120 + 100 * u)
    const b = Math.round(20 * (1 - u))
    return `rgba(${r},${g},${b},${alpha})`
  }
  const u = t / 0.33
  const r = Math.round(180 + 75 * u)
  const g = Math.round(30 + 90 * u)
  const b = Math.round(10 * (1 - u))
  return `rgba(${r},${g},${b},${alpha})`
}

/** EN: Cool white/cyan glitter for delete shatter shards. */
export function fireShatterColor(seed: number, lifeRatio: number, alpha: number): string {
  const flash = 0.55 + 0.45 * Math.sin(seed * 12.5 + lifeRatio * 18)
  const cool = seed % 1
  if (cool < 0.35) {
    const g = Math.round(210 + 45 * flash)
    const b = 255
    const r = Math.round(180 + 60 * flash)
    return `rgba(${r},${g},${b},${alpha})`
  }
  if (cool < 0.7) {
    const r = 255
    const g = Math.round(230 + 25 * flash)
    const b = Math.round(160 + 70 * flash)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const r = 255
  const g = Math.round(245 + 10 * flash)
  const b = Math.round(230 + 25 * flash)
  return `rgba(${r},${g},${b},${alpha})`
}
