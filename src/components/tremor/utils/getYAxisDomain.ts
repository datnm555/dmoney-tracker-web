// Tremor getYAxisDomain [v0.0.0]
// Source: github.com/tremorlabs/tremor (Apache-2.0). Adapted for dmoney: import paths only.

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0)
  const maxDomain = maxValue ?? "auto"
  return [minDomain, maxDomain]
}
