// ===================================================================
// QUALITY.JS
// This file decides, once, whether the visitor is on something we
// should treat as "mobile" (a smaller screen, or a touch-only
// device) versus "desktop." Other files use this to quietly do less
// work on mobile - fewer stars, simpler moon, etc - without changing
// anything about how the site looks or behaves on desktop.
// ===================================================================

export function getQuality() {
  // Two different signals, either one is enough to count as mobile:
  //   - a narrow window (under 768px wide) - a common phone/tablet cutoff
  //   - a "coarse" pointer - this means touch (a finger), as opposed
  //     to "fine" pointers like a mouse or trackpad. This catches
  //     touch devices even if their screen happens to be wide.
  const isNarrowScreen = window.innerWidth < 768
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches

  return isNarrowScreen || isCoarsePointer ? 'mobile' : 'desktop'
}
