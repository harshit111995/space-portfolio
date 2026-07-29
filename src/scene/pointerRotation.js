// ===================================================================
// POINTERROTATION.JS
// A small, shared helper that gives any celestial body the same
// gentle "turn toward the cursor" behavior the Moon already has (see
// src/scene/moon.js) - without every single body file needing to
// duplicate its own mouse-tracking and damping math.
//
// The Moon's own version sets its rotation DIRECTLY from the mouse
// position, because the Moon has no other rotation of its own to
// protect. The other bodies (Saturn, Mars, Venus, Jupiter, Mercury,
// Earth) already have their own steady auto-spin, so this file is
// built to ADD an offset on top of whatever rotation a body already
// has, rather than replacing it - see updateCursorRotation() below
// for exactly how.
// ===================================================================

import { prefersReducedMotion } from '../motion/reducedMotion.js'

// ---- Tracking the mouse position, once, for every body to share ---------
// Same "normalized -1 to 1" technique as src/scene/moon.js: 0 means
// the middle of the screen, negative means left/top, positive means
// right/bottom. One shared listener here (instead of a separate one
// per body file) is just less duplicated code doing the exact same job.
let mouseX = 0
let mouseY = 0

window.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1
  mouseY = (event.clientY / window.innerHeight) * 2 - 1
})

// Call this once per body, every frame (inside that body's own
// addUpdate callback). "state" is a plain, per-body object the CALLER
// creates and keeps around between frames, e.g. { offsetX: 0, offsetY: 0 } -
// this file doesn't remember anything per-body itself, so several
// different bodies can each keep their own independent, currently
// eased-toward offset without mixing each other up.
//
// maxYaw/maxPitch cap how far the offset can ever drift (in radians) -
// kept small and asymmetric on purpose, the same shape as the Moon's
// own 0.3 (yaw) / 0.15 (pitch) split, just gentler here since this
// effect is layered on TOP of an existing spin rather than being a
// body's only source of motion.
export function updateCursorRotation(state, { maxYaw = 0.15, maxPitch = 0.075, damp = 0.05 } = {}) {
  // Reduced motion: hold the offset at exactly zero, forever, instead
  // of easing toward the cursor - a body's own steady auto-spin (set
  // up separately in its own file) is untouched either way, only this
  // extra cursor-reactive drift is switched off.
  if (prefersReducedMotion) {
    state.offsetX = 0
    state.offsetY = 0
    return state
  }

  const targetOffsetY = mouseX * maxYaw
  const targetOffsetX = mouseY * maxPitch

  // Damping (a lerp): nudge the current offset part-way toward the
  // target every frame instead of snapping straight to it - the same
  // technique the Moon uses, which is what makes the motion read as
  // smooth and a little weighty rather than jittery.
  state.offsetY += (targetOffsetY - state.offsetY) * damp
  state.offsetX += (targetOffsetX - state.offsetX) * damp

  return state
}
