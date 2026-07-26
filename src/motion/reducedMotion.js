// ===================================================================
// REDUCEDMOTION.JS
// A single place to check whether the visitor's operating system has
// its "reduce motion" accessibility setting turned on. Other files
// import this ONE answer instead of each checking separately, so
// everyone agrees and it's only ever read once.
// ===================================================================

// window.matchMedia lets JavaScript ask the browser about a setting
// like this. .matches is true only if the visitor has reduced motion
// turned on in their operating system or browser.
export const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches
