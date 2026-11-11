// Tremor useOnWindowResize [v0.0.2]
// Source: github.com/tremorlabs/tremor (Apache-2.0). Adapted for dmoney: import paths only.

import * as React from "react"

export const useOnWindowResize = (handler: () => void) => {
  React.useEffect(() => {
    const handleResize = () => {
      handler()
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [handler])
}
