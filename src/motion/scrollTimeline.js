// ===================================================================
// SCROLLTIMELINE.JS  (v2 cinematic spine)
// This file connects scrolling to the camera's position AND its
// rotation. As you scroll down the page, the camera flies backward
// through the 3D scene through 10 stops, gently banking toward each
// one as it passes - like a plane easing into a turn - rather than
// staring dead ahead the whole time.
//
// It uses GSAP's ScrollTrigger to "scrub" the animation: instead of
// playing on its own, the animation's progress is tied directly to
// how far down the page you've scrolled. ScrollTrigger was already
// switched on and connected to the smooth-scroll setup in
// src/motion/lenis.js - this file just reuses that, it doesn't set
// any of that up again.
// ===================================================================

import * as THREE from 'three'
import gsap from 'gsap'
import { prefersReducedMotion } from './reducedMotion.js'
import sceneApi from '../scene/scene.js'

// ---- Shared cinematic rotation target -------------------------------
// The camera's rotation has TWO separate sources that both need to
// apply at once: this file's own gentle banking motion, and the
// visitor's own click-and-drag look-around (src/ui/cursor.js). If
// both tried to set camera.rotation directly, whichever one happened
// to run last each frame would silently erase the other's effect.
//
// Instead, this file only ever animates this plain, separate object -
// never camera.rotation itself. cursor.js reads it every frame and
// ADDS its own drag offset on top before applying the combined result
// to the camera, so the two sources add together instead of fighting.
export const cinematicRotation = { x: 0, y: 0 }

// ---- The 10 stops along the journey -----------------------------------
// Each stop is a point along the flight where a "body" (a planet,
// certificate, project card, etc. - added in later phases) will sit.
// For now, only the numbers matter:
//   percent  -> how far down the page (0-100%) this stop happens
//   z        -> how far along the camera's path this stop is
//   bankY/X  -> how far the camera gently turns/tilts as it passes
//               this stop, in radians (small numbers - a few degrees)
//
// bankY alternates sign (+/-) from one stop to the next, which is
// what creates the side-to-side "curving flight" feeling instead of
// banking the same way every time. The very last stop banks back to
// 0 instead of continuing the pattern, so the journey ends facing
// forward rather than mid-turn.
const stops = [
  { percent: 4, z: -20, bankY: 0.12, bankX: 0.05 },
  { percent: 12, z: -50, bankY: -0.12, bankX: -0.05 },
  { percent: 37, z: -80, bankY: 0.12, bankX: 0.05 },
  { percent: 69, z: -110, bankY: -0.12, bankX: -0.05 },
  { percent: 74, z: -140, bankY: 0.12, bankX: 0.05 },
  { percent: 78, z: -170, bankY: -0.12, bankX: -0.05 },
  { percent: 84, z: -200, bankY: 0.12, bankX: 0.05 },
  { percent: 92, z: -230, bankY: -0.12, bankX: -0.05 },
  { percent: 96, z: -260, bankY: 0.12, bankX: 0.05 },
  { percent: 100, z: -290, bankY: 0, bankX: 0 },
]

// ---- Temporary placeholder markers --------------------------------------
// A small wireframe box at each stop, so the spine's spacing can
// actually be SEEN before real content exists. These are throwaway -
// later phases replace them with the real planets/cards one by one.
// One shared geometry and material is reused for all 10 boxes, since
// they all look identical - that's lighter on the GPU than making 10
// separate copies.
function addPlaceholderMarkers() {
  const markerGeometry = new THREE.BoxGeometry(6, 6, 6)
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x6fb7ff,
    wireframe: true,
  })

  stops.forEach((stop, index) => {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    // Alternate left/right of the camera's straight path (x = 0), so
    // the 10 markers read as a curving trail rather than a single
    // straight line the camera flies directly through.
    const side = index % 2 === 0 ? 1 : -1
    marker.position.set(side * 10, 0, stop.z)
    sceneApi.scene.add(marker)
  })
}

export function init(camera) {
  addPlaceholderMarkers()

  // ---- The scroll-driven timeline --------------------------------------
  //   trigger: "#app"   -> watch scroll progress across our whole page
  //                        content wrapper
  //   start: "top top"   -> the animation begins when the top of #app
  //                        hits the top of the screen (i.e. right away)
  //   end: "bottom bottom" -> the animation finishes when the bottom of
  //                        #app hits the bottom of the screen (i.e. the
  //                        very end of the page)
  //   scrub: 1           -> instead of jumping to match scroll position
  //                        instantly, it takes about 1 second to catch
  //                        up, which feels smoother than a hard 1-to-1 link
  //
  // If reduced motion is on, scrub becomes "true" instead of "1" - see
  // src/motion/reducedMotion.js for why.
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#app',
      start: 'top top',
      end: 'bottom bottom',
      scrub: prefersReducedMotion ? true : 1,
    },
  })

  // ---- The camera's position, through all 10 stops -------------------------
  // The timeline's total length is treated as 100 units, matching
  // scroll percentage 1-to-1. Lock in the exact starting point first,
  // then chain a .to() for each stop above - each one's "duration" is
  // simply the gap between that stop's percent and the previous one,
  // so they land at exactly the right point in the scroll no matter
  // how uneven the spacing between stops is.
  timeline.set(camera.position, { z: 10 })

  let previousPercent = 0
  for (const stop of stops) {
    timeline.to(camera.position, {
      z: stop.z,
      duration: stop.percent - previousPercent,
      ease: 'none',
    })
    previousPercent = stop.percent
  }

  // ---- The camera's cinematic banking, in parallel with the position above --
  // These tweens animate cinematicRotation (NOT camera.rotation - see
  // the note above), and are placed at the exact same timeline
  // positions as the position tweens above, using the running
  // "atPercent" number as an absolute position - this is what makes
  // them play IN PARALLEL with the position moves, instead of playing
  // one-after-the-other and doubling the total length.
  //
  // Skipped entirely if the visitor has reduced motion turned on: the
  // camera still flies the full journey (position, above), just
  // without this extra turning/tilting motion layered on top.
  if (!prefersReducedMotion) {
    timeline.set(cinematicRotation, { x: 0, y: 0 }, 0)

    let atPercent = 0
    for (const stop of stops) {
      timeline.to(
        cinematicRotation,
        {
          y: stop.bankY,
          x: stop.bankX,
          duration: stop.percent - atPercent,
          ease: 'none',
        },
        atPercent,
      )
      atPercent = stop.percent
    }
  }

  // Note: only the camera moves/rotates here (via cinematicRotation).
  // No meshes/objects in the scene are touched by this file, other
  // than the temporary placeholder markers built above.
}
