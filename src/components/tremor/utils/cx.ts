// Tremor cx [v0.0.0]
// Source: github.com/tremorlabs/tremor (Apache-2.0). Adapted for dmoney: import paths only.

import clsx, { type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args))
}
