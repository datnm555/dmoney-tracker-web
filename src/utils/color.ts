/** '#rrggbb' + alpha (0–1) → '#rrggbbaa'; anything else is passed through untouched. */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}
