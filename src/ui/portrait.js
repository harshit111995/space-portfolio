// ===================================================================
// PORTRAIT.JS
// This file makes the circular portrait photo drift a tiny bit as you
// move the mouse - a subtle "parallax" (depth) effect, as if the
// photo sits slightly back in its own little pocket of the scene
// rather than being flat against the screen.
// ===================================================================

import gsap from 'gsap'

export function initPortraitParallax() {
  const portrait = document.querySelector('.portrait')
  if (!portrait) return

  // gsap.quickTo builds a small, reusable function for smoothly
  // animating ONE property over and over again - perfect for an
  // effect like this that keeps re-aiming at a new target every time
  // the mouse moves. Calling xTo(5), for example, eases the
  // portrait's x position smoothly toward 5px instead of snapping
  // there instantly.
  const xTo = gsap.quickTo(portrait, 'x', { duration: 0.6, ease: 'power3' })
  const yTo = gsap.quickTo(portrait, 'y', { duration: 0.6, ease: 'power3' })

  window.addEventListener('mousemove', (event) => {
    // Turn the mouse position into a -1 to 1 range, where 0 means the
    // exact center of the screen.
    const normalizedX = (event.clientX / window.innerWidth) * 2 - 1
    const normalizedY = (event.clientY / window.innerHeight) * 2 - 1

    // Scale that down to a small +-10px range. This is deliberately
    // much less movement than the planets get elsewhere in the scene,
    // so the portrait reads as sitting close to the "camera" (barely
    // drifting) rather than floating loosely on top of everything.
    xTo(normalizedX * 10)
    yTo(normalizedY * 10)
  })
}
