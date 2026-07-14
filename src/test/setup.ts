import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver; Radix UI (react-use-size) needs it.
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom lacks pointer-capture and scrollIntoView; Radix Select needs them.
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {})
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {})
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

// jsdom does not implement window.matchMedia; some libraries still probe it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
