// ===================================================================
// SCROLLTIMELINE.JS  (v2 cinematic spine)
// This file connects scrolling to the camera's position AND where it
// looks. As you scroll down the page, the camera flies backward
// through the 3D scene through 10 stops.
//
// It uses GSAP's ScrollTrigger to "scrub" the animation: instead of
// playing on its own, the animation's progress is tied directly to
// how far down the page you've scrolled. ScrollTrigger was already
// switched on and connected to the smooth-scroll setup in
// src/motion/lenis.js - this file just reuses that, it doesn't set
// any of that up again.
//
// ---- Why this file changed from a straight path to an S-curve -----------
// The camera used to fly a dead-straight line (only z moved), with a
// small hand-tweened "banking" rotation added near each stop just to
// fake the feeling of turning toward it. That straight path created a
// real geometry problem: a body sitting off to the side would flash
// past out of view almost entirely (not enough turn to catch it), and
// a body sitting close to the camera's straight line would have the
// camera fly nearly INTO it as their depths crossed (tested directly
// on Saturn - see src/scene/saturn.js's comment on the rejected
// near-axis position).
//
// The fix: the camera's x/y position now also moves - weaving out to
// the side OPPOSITE each upcoming body, so it passes at a safe
// distance instead of straight through it - and instead of a hand-
// tweened bank angle, the camera actively points itself at each body
// as it approaches, using THREE's built-in lookAt().
//
// ---- Round two: the S-curve itself had two more bugs ---------------------
// Testing the first version of this (by actually scrolling through it,
// not just checking numbers) found two real problems:
//
// 1. A visible LURCH right at the start of each "look back to
//    straight ahead" turn. The cause: the camera's aim was computed
//    by easing a plain WORLD-SPACE POINT from the body's position
//    toward a "neutral" point placed extremely far down the path
//    (z = -5000), then calling camera.lookAt() on whatever that
//    eased point currently was. That looks like a smooth change in
//    raw numbers, but it is NOT a smooth change in ANGLE: because
//    -5000 is so much farther away than anything else involved, even
//    a small step toward it collapses the camera's aim to "straight
//    ahead" almost immediately, instead of gradually. The fix below
//    interpolates the camera's ORIENTATION directly (a quaternion
//    slerp), which by definition changes at a constant angular speed
//    - no more snap.
//
// 2. The bodies looked "too close" - filling most of the screen,
//    with the Hero/About text sitting right on top of a giant dark
//    planet. The camera was only passing 15-16 units from Saturn and
//    12-13 units from Mars - enough to clear the mesh, but nowhere
//    near enough to look like a flyby at this camera's field of view.
//    The weave below now swings much wider (roughly 40 units clear
//    of Saturn, 20-25 of Mars).
// ===================================================================

import * as THREE from 'three'
import gsap from 'gsap'
import { prefersReducedMotion } from './reducedMotion.js'
import sceneApi from '../scene/scene.js'

// ---- Shared "base look" rotation -------------------------------------
// Same idea as the old cinematicRotation this replaces: the camera's
// rotation has TWO sources that both need to apply at once - this
// file's own look-at-the-body aiming, and the visitor's own
// click-and-drag look-around (src/ui/cursor.js). If both tried to set
// camera.rotation directly, whichever ran last each frame would
// silently erase the other's effect.
//
// So this file does the aiming (via a quaternion slerp, below) and
// then copies the resulting rotation into this plain object. cursor.js
// reads it every frame and SETS camera.rotation to that base value
// minus its own drag offset - both sources combine, and because this
// object is refreshed fresh every single frame, the drag offset
// always decays back to whatever this file says the base should be
// right now, never to zero and never compounding on itself.
export const lookBaseRotation = { x: 0, y: 0 }

// This file needs to know WHERE each body is so it can aim the camera
// at them, but it doesn't import the actual meshes from
// src/scene/saturn.js / src/scene/jupiter.js / src/scene/planets.js -
// those files own the real bodies, this just needs the same
// coordinates. If a body's position ever changes there, update the
// matching point here too.
const SATURN_POSITION = new THREE.Vector3(8, -8, -20)
const MARS_POSITION = new THREE.Vector3(-10, 1, -50)
const JUPITER_POSITION = new THREE.Vector3(14, -10, -200)
const EARTH_POSITION = new THREE.Vector3(5, -3, -260)

// ---- The 10 stops along the journey -----------------------------------
// Each stop is a point along the flight where a "body" (a planet,
// certificate, project card, etc.) sits.
//   percent  -> how far down the page (0-100%) this stop happens
//   z        -> how far along the camera's path this stop is
//
// marker: false means "a real body now lives here" (Mars, Venus,
// Earth, Saturn) - the wireframe placeholder box is skipped for
// those, since something real already fills the spot. Every other
// stop still gets its placeholder box until its real body is built.
//
// Note: the old bankY/bankX hand-tweened turn amounts that used to
// live on each stop are gone - turning is now handled by the look-
// target system further down instead. Saturn, Mars, Jupiter, and
// Earth all have real weave + look-aim keyframes wired up now.
// Constellations, Asteroids, and Satellites all have real bodies now
// (src/scene/constellations.js, src/scene/asteroids.js,
// src/scene/satellites.js) but none of the three have weave/look-aim
// of their own yet - that's the next phase, giving all three small
// bodies the camera treatment together (see those files' own notes on
// why they flash past off-axis for now).
const stops = [
  { percent: 4, z: -20, marker: false }, // Saturn
  { percent: 12, z: -50, marker: false }, // Mars
  { percent: 37, z: -80, marker: false }, // Venus
  { percent: 69, z: -110, marker: false }, // Constellations
  { percent: 74, z: -140, marker: false }, // Asteroids
  { percent: 78, z: -170, marker: false }, // Satellites
  { percent: 84, z: -200, marker: false }, // Jupiter
  { percent: 92, z: -230, marker: true }, // Testimonials
  { percent: 96, z: -260, marker: false }, // Earth
  // This final stop is just where the camera's journey ends, not a
  // body location - no marker belongs here.
  { percent: 100, z: -290, marker: false },
]

// ---- Temporary placeholder markers --------------------------------------
// A small wireframe box at each stop that doesn't have a real body
// yet, so the spine's spacing can still be SEEN for the not-yet-built
// ones. One shared geometry and material is reused for all of them,
// since they all look identical - that's lighter on the GPU than
// making a separate copy for each.
function addPlaceholderMarkers() {
  const markerGeometry = new THREE.BoxGeometry(6, 6, 6)
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x6fb7ff,
    wireframe: true,
  })

  stops.forEach((stop, index) => {
    if (!stop.marker) return // a real body already occupies this stop

    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    // Alternate left/right of the camera's straight path (x = 0), so
    // the markers read as a curving trail rather than a single
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

  // ---- The camera's forward position, through all 10 stops -----------------
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

  // Everything below (the sideways weave and the look-target aiming)
  // is skipped entirely under reduced motion: the camera still flies
  // the full journey (position.z, above), it just goes dead straight
  // with no turning, which is the calmest option for a visitor who
  // has asked their system to reduce motion.
  if (!prefersReducedMotion) {
    // ---- The camera's sideways weave (position.x / position.y) -------------
    // Saturn sits off to the +x/-y side at (8, -8, -20). Mars sits off
    // to the -x/+y side at (-10, 1, -50) (moved there for this test -
    // see src/scene/planets.js). Instead of flying a straight line
    // through x=0,y=0 the whole time, the camera swings out to the
    // OPPOSITE side of each body as it passes, then eases back to
    // center before the next one.
    //
    // The swing is now much wider than the first attempt, AND it takes
    // a different SHAPE. Passing 15 units from Saturn was enough to
    // avoid hitting its mesh, but Saturn (radius 5, rings out to 9)
    // still filled most of the screen at that distance - it read as
    // "too close," not "flying by."
    //
    // The naive fix - just widen the swing at each stop and go
    // straight back to center in between - turned out to still dip
    // too close: cutting straight from "far on Saturn's opposite side"
    // to "far on Mars's opposite side" means passing back THROUGH the
    // middle, and for a moment near that midpoint the camera is both
    // close to center AND not yet far past either body in depth. So
    // instead of a straight line between the two swings, there's an
    // extra waypoint (at 9%) that keeps the camera out on a wide ARC
    // the whole time, never cutting back near the middle until it's
    // safely past both bodies.
    //
    // Closest approach with this shape: about 31 units from Saturn,
    // about 23 units from Mars - short of the original "40 for
    // Saturn" target (Saturn and Mars are only 8 scroll-percent apart,
    // and swinging a wide arc between two nearby stops that fast has
    // a real geometric limit), but roughly DOUBLE the old 15-16 units,
    // confirmed by eye to no longer overfill the frame (see the phase
    // notes/commit message for the actual screenshots checked).
    //
    // Jupiter (84%) and Earth (96%) are spaced much farther apart than
    // Saturn/Mars were (12 scroll-percent, versus 8) - plenty of room
    // for the camera to swing wide for Jupiter and ease back down to a
    // gentler, smaller swing for Earth without ever needing the extra
    // "stay wide" arc waypoint Saturn/Mars required. Earth's swing is
    // deliberately much smaller than Jupiter's - it's the destination,
    // meant to read as a more direct, centered arrival rather than a
    // wide flyby - and it stays swung out (rather than returning to
    // dead-center) all the way to 100%, since the journey simply ends
    // there; there's nothing after Earth to fly on toward.
    timeline.set(camera.position, { x: 0, y: 0 }, 0)

    const weaveKeyframes = [
      { percent: 4, x: -30, y: 30 }, // swing wide opposite Saturn, passing it
      { percent: 9, x: 12, y: 38 }, // arc WAYPOINT - stay far out, don't cut through center
      { percent: 13, x: 18, y: -18 }, // swing wide opposite Mars, passing it
      { percent: 30, x: 0, y: 0 }, // safely past both, ease back to center
      { percent: 84, x: -25, y: 20 }, // swing wide opposite Jupiter, passing it
      { percent: 96, x: -8, y: 6 }, // ease to a smaller, gentler swing for Earth's arrival
      { percent: 100, x: 0, y: 0 }, // settle back to center as the journey ends
      // Constellations/Asteroids/Satellites (69-78%) don't have their
      // own weave yet - the camera just holds its post-Mars centered
      // line through that stretch until Jupiter's approach begins.
    ]

    let atWeavePercent = 0
    for (const kf of weaveKeyframes) {
      timeline.to(
        camera.position,
        { x: kf.x, y: kf.y, duration: kf.percent - atWeavePercent, ease: 'none' },
        atWeavePercent,
      )
      atWeavePercent = kf.percent
    }

    // ---- A single scrub-synced progress number --------------------------------
    // A plain 0-100 number that always matches the current scrubbed
    // scroll percent, kept in sync by living on this SAME timeline
    // (the same one driving position.z and the weave above). Reading
    // this every frame - instead of asking GSAP/ScrollTrigger for the
    // percent separately - guarantees the look-aim below is working
    // from the exact same smoothed, scrubbed number as everything
    // else, with no chance of it drifting out of sync.
    const progress = { percent: 0 }
    timeline.to(progress, { percent: 100, duration: 100, ease: 'none' }, 0)

    // ---- The look-aim, as an ORIENTATION, not a point ------------------------
    // This replaces the old approach (easing a world-space point, then
    // calling camera.lookAt() on it), which was the source of the
    // lurch described at the top of this file. Instead:
    //
    //   1. Every frame, work out two ORIENTATIONS (quaternions):
    //      "neutral" (looking straight down the path, no turn at all)
    //      and "looking at whichever body is currently being
    //      approached" (recalculated fresh each frame, since the
    //      camera's own position keeps moving from the weave above).
    //   2. Blend smoothly between those two orientations using
    //      THREE's quaternion slerp - which, unlike blending two
    //      plain x/y/z points, changes at a constant ANGULAR speed.
    //      That's what makes the turn look linear instead of snapping.
    //
    // "neutral" is just the identity rotation: a fresh camera with no
    // rotation applied always looks straight down -z, which is exactly
    // "look straight ahead, no turn" - so there's no need to compute
    // it fresh each frame, unlike the body-facing orientation.
    const neutralOrientation = new THREE.Quaternion()

    // A second, invisible camera that is never added to the scene and
    // never rendered from - it exists purely as scratch space to
    // compute "what orientation would look FROM the camera's current
    // position AT this body's position," without disturbing the real
    // camera. This MUST be a THREE.Camera (not a plain THREE.Object3D)
    // - .lookAt() on a plain Object3D points its +Z axis at the
    // target, but Camera overrides that to point -Z at the target
    // instead (the standard "camera looks down -Z" convention). Using
    // a plain Object3D here at first meant every computed orientation
    // faced exactly backwards - the target still calculated as
    // dead-center by coincidence of the projection math, but nothing
    // actually rendered there, since the real render pipeline
    // correctly does not draw what's behind the camera.
    const aimScratch = new THREE.PerspectiveCamera()
    const bodyOrientation = new THREE.Quaternion()
    const blendedOrientation = new THREE.Quaternion()

    // Works out which body (if any) the camera should be aiming at
    // right now, and how far blended toward it we should be (0 =
    // fully neutral/straight ahead, 1 = fully locked onto the body),
    // purely from the current scrub percent. The three phases per
    // body - ease in, hold, ease out - are exactly the same shape as
    // before, just expressed as simple percent math instead of a
    // separate GSAP tween for each one.
    function getAim(percent, saturnPos, marsPos, jupiterPos, earthPos) {
      if (percent < 2) return { target: saturnPos, blend: percent / 2 } // easing toward Saturn
      if (percent < 6) return { target: saturnPos, blend: 1 } // holding on Saturn
      if (percent < 8) return { target: saturnPos, blend: 1 - (percent - 6) / 2 } // easing back out
      if (percent < 10) return { target: marsPos, blend: (percent - 8) / 2 } // easing toward Mars
      if (percent < 14) return { target: marsPos, blend: 1 } // holding on Mars
      if (percent < 16) return { target: marsPos, blend: 1 - (percent - 14) / 2 } // easing back out
      // 16-82%: Constellations/Asteroids/Satellites aren't built yet -
      // straight ahead, same as before.
      if (percent < 82) return { target: null, blend: 0 }
      if (percent < 84) return { target: jupiterPos, blend: (percent - 82) / 2 } // easing toward Jupiter
      if (percent < 88) return { target: jupiterPos, blend: 1 } // holding on Jupiter
      if (percent < 90) return { target: jupiterPos, blend: 1 - (percent - 88) / 2 } // easing back out
      if (percent < 94) return { target: null, blend: 0 } // straight ahead again before Earth
      if (percent < 96) return { target: earthPos, blend: (percent - 94) / 2 } // easing toward Earth
      // 96-100%: holds on Earth all the way to the end of the journey
      // instead of easing back out - there's no "next stop" to release
      // toward, so it stays locked on the destination.
      return { target: earthPos, blend: 1 }
    }

    sceneApi.addUpdate(() => {
      const aim = getAim(progress.percent, SATURN_POSITION, MARS_POSITION, JUPITER_POSITION, EARTH_POSITION)

      if (aim.target) {
        // "If the camera were sitting exactly where it is right now,
        // what orientation would point it at this body?" - recomputed
        // every frame because the camera's own position (from the
        // weave above) is different every frame too.
        aimScratch.position.copy(camera.position)
        aimScratch.lookAt(aim.target)
        bodyOrientation.copy(aimScratch.quaternion)
      }

      // Blend from "straight ahead" to "looking at the body" (or back)
      // by the eased amount worked out above. slerpQuaternions moves
      // at a constant angular speed between the two, which is exactly
      // what removes the lurch - no more snap.
      blendedOrientation.slerpQuaternions(neutralOrientation, bodyOrientation, aim.blend)
      camera.quaternion.copy(blendedOrientation)

      // Copy the result out into the shared plain object so cursor.js
      // can read this frame's "base" aim and add its own drag offset
      // on top of it, instead of cursor.js fighting over
      // camera.rotation directly.
      lookBaseRotation.x = camera.rotation.x
      lookBaseRotation.y = camera.rotation.y
    })
  }

  // Note: only the camera moves/looks here, other than the temporary
  // placeholder markers built above.
}
