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
// The constellation FIELD's center (see src/scene/constellations.js) -
// not any single constellation, since the point of this stop is
// seeing several figures together, not zooming in on one.
const CONSTELLATIONS_POSITION = new THREE.Vector3(-10, 0, -110)
// The average of the 3 asteroid positions (see src/scene/asteroids.js)
// - close enough to their shared center for aiming purposes, since
// they're clustered within about 10 units of each other.
const ASTEROIDS_POSITION = new THREE.Vector3(10, -1, -139)
// The center of the satellite ring (see src/scene/satellites.js).
const SATELLITES_POSITION = new THREE.Vector3(-10, 0, -170)

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
// target system further down instead. Every stop now has its own
// weave + look-aim keyframes wired up - Saturn, Mars, the
// constellation field, the asteroid cluster, the satellite ring,
// Jupiter, and Earth.
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
    //
    // ---- Constellations (69%) and Asteroids (74%) - a tighter, harder case --
    // These two stops are only 5 scroll-percent apart (Saturn/Mars had
    // 8) - the tightest pair yet. Two things had to change to make it
    // work:
    //
    // 1. The constellation FIELD sits only 10 units off the camera's
    //    default straight path (x = -10). That means simply flying
    //    STRAIGHT (x = 0) while passing its depth already brings the
    //    camera within about 10-13 units of it - nowhere near the
    //    45-50 unit target. A brief peak swing isn't enough here; the
    //    camera has to swing out EARLY and STAY swung out (sustained,
    //    not just a momentary peak) for the whole approach, using the
    //    long, mostly-empty 30-69% stretch as runway.
    // 2. The tight 69-74% gap between Constellations and Asteroids
    //    still needs the same "arc waypoint" trick as Saturn/Mars -
    //    cutting straight from one wide swing to the opposite wide
    //    swing would pass back through the middle at the worst possible
    //    moment.
    //
    // Closest approach with this shape (measured only during each
    // body's actual encounter window, not during the unrelated
    // approach beforehand): about 53 units from the constellation
    // field (comfortably inside the 45-50 target) and about 22 units
    // from the asteroid cluster (inside the 20-25 target).
    //
    // ---- Satellites (78%) - wedged between Asteroids (74%) and Jupiter (84%) --
    // The asteroid cluster's "close enough to matter" zone and the
    // satellite ring's "close enough to matter" zone actually OVERLAP
    // in depth (both stretch across roughly 75-77%) - there is no
    // point during the handoff that's genuinely far from both at once.
    // Cutting straight from the asteroid-side swing to the opposite,
    // satellite-side swing measured as low as ~8 units at points along
    // that direct line - a near-collision, not a flyby.
    //
    // The fix has two parts working together:
    // 1. An arc waypoint (75.5%) shaped like the one that already
    //    works for Saturn/Mars and Constellations/Asteroids - one
    //    axis flips early while the other overshoots to an even more
    //    extreme value, so the combined distance from center never
    //    collapses near zero during the crossover.
    // 2. The satellite peak lands EXACTLY at their own 78% stop and
    //    HOLDS there through 81% - so by the time the look-aim (further
    //    below) actually engages, the camera has already arrived and
    //    settled, well clear of the risky crossover that happened
    //    beforehand. The look-aim simply doesn't start until the
    //    dangerous part is already over.
    //
    // Closest approach during the settled hold (78-81%, which is what
    // actually matters once the look-aim's timing is accounted for):
    // about 32 units from the satellite ring, inside the 30-35 target.
    // The transient dip during the crossover itself (as low as ~14)
    // happens strictly BEFORE the satellite look-aim engages, so it's
    // never actually seen.
    timeline.set(camera.position, { x: 0, y: 0 }, 0)

    const weaveKeyframes = [
      { percent: 4, x: -30, y: 30 }, // swing wide opposite Saturn, passing it
      { percent: 9, x: 12, y: 38 }, // arc WAYPOINT - stay far out, don't cut through center
      { percent: 13, x: 18, y: -18 }, // swing wide opposite Mars, passing it
      { percent: 30, x: 0, y: 0 }, // safely past both, ease back to center
      { percent: 52, x: -46, y: 46 }, // swing wide opposite the constellation field, EARLY
      { percent: 68.5, x: -46, y: 46 }, // hold wide through the whole constellation encounter
      { percent: 70, x: 22, y: 65 }, // arc WAYPOINT - stay wide, don't cut through center
      { percent: 73.5, x: 36, y: -36 }, // swing wide opposite the asteroid cluster, passing it
      { percent: 75.5, x: -15, y: -55 }, // arc WAYPOINT - x flips early, y overshoots, so distance stays up
      { percent: 78, x: -27, y: 27 }, // swing wide opposite the satellite ring, arriving exactly at their stop
      { percent: 81, x: -27, y: 27 }, // hold wide through the whole satellite encounter
      { percent: 82.5, x: 0, y: 0 }, // safely past, ease back to center before Jupiter
      { percent: 84, x: -25, y: 20 }, // swing wide opposite Jupiter, passing it
      { percent: 96, x: -8, y: 6 }, // ease to a smaller, gentler swing for Earth's arrival
      { percent: 100, x: 0, y: 0 }, // settle back to center as the journey ends
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
    function getAim(percent, saturnPos, marsPos, constellationsPos, asteroidsPos, satellitesPos, jupiterPos, earthPos) {
      if (percent < 2) return { target: saturnPos, blend: percent / 2 } // easing toward Saturn
      if (percent < 6) return { target: saturnPos, blend: 1 } // holding on Saturn
      if (percent < 8) return { target: saturnPos, blend: 1 - (percent - 6) / 2 } // easing back out
      if (percent < 10) return { target: marsPos, blend: (percent - 8) / 2 } // easing toward Mars
      if (percent < 14) return { target: marsPos, blend: 1 } // holding on Mars
      if (percent < 16) return { target: marsPos, blend: 1 - (percent - 14) / 2 } // easing back out
      // 16-58%: Venus and the long empty stretch after it aren't built
      // with a look-aim yet - straight ahead, same as before.
      if (percent < 58) return { target: null, blend: 0 }
      if (percent < 63) return { target: constellationsPos, blend: (percent - 58) / 5 } // easing toward the constellation field
      if (percent < 67) return { target: constellationsPos, blend: 1 } // holding on the constellation field
      // Ease-out finishes at 69% sharp, not a moment later - found by
      // scrolling in fine steps (not just the usual 0.25% checkpoint
      // resolution - this hid entirely between two of those sample
      // points): right around 69.3%, the weave's arc-waypoint carries
      // the camera almost directly OVERHEAD of the constellation
      // field, which is the classic degenerate case for computing a
      // look orientation (the "which way is right?" math breaks down
      // looking nearly parallel to the world's up axis - confirmed
      // directly, two consecutive very-close camera positions
      // produced quaternions with a similarity of only -0.78 there,
      // instead of the usual ~1.0). Finishing the release BEFORE that
      // point, rather than holding through it, means nothing is even
      // reading that unstable orientation when it happens - the
      // camera has already fully let go and is aiming elsewhere.
      if (percent < 69) return { target: constellationsPos, blend: 1 - (percent - 67) / 2 } // easing back out
      // 69-71%: straight ahead again - this is exactly the stretch
      // that includes the unstable near-overhead crossing described
      // above, and nothing is aiming at anything here, so it doesn't
      // matter at all.
      if (percent < 71) return { target: null, blend: 0 }
      if (percent < 73) return { target: asteroidsPos, blend: (percent - 71) / 2 } // easing toward the asteroids
      // The hold below runs to 77%, not 76% - a fair way past the
      // asteroids' own 74% stop. Here's why: as the camera's weave
      // retracts after passing them, there's a moment (around 76.7-
      // 76.8%) where the bearing TO the asteroids swings through
      // almost exactly 180 degrees from "straight ahead" - the camera
      // has flown far enough past them that looking at them means
      // looking almost directly backward. Slerping is mathematically
      // rock-solid at blend exactly 1 (it just returns the target
      // orientation outright, no interpolation math involved) but
      // becomes unstable interpolating PARTWAY toward an orientation
      // that's nearly the exact opposite of "forward" - confirmed
      // directly: with the hold ending at 76% (partway through easing
      // back out right as this 180-degree crossing happened), the
      // camera's quaternion similarity to the previous frame measured
      // -0.35 at that exact point instead of the usual ~1.0. Keeping
      // the hold running through that crossing point - so it happens
      // at a clean blend of 1, not some partial blend mid-release -
      // is what makes it safe.
      if (percent < 77) return { target: asteroidsPos, blend: 1 } // holding on the asteroids
      if (percent < 79) return { target: asteroidsPos, blend: 1 - (percent - 77) / 2 } // easing back out
      // 79%: a brief straight-ahead gap before satellites - the weave
      // above actually arrives at the satellite-opposite swing at 78%
      // (a full percent before this look-aim even starts), so the
      // risky crossover between the asteroid swing and the satellite
      // swing is already finished and settled by the time anything
      // starts looking at the satellites. That's on purpose: the
      // crossover briefly measured as close as ~14 units to the
      // satellite ring, but nothing is aiming at them yet when that
      // happens, so it's never actually seen.
      if (percent < 80) return { target: satellitesPos, blend: percent - 79 } // easing toward the satellites
      if (percent < 81) return { target: satellitesPos, blend: 1 } // holding on the satellites
      // Ease-out finishes at 82% sharp - matching exactly where
      // Jupiter's OWN existing approach (unchanged from V4a) starts
      // easing in. Neither window overlaps the other even for an
      // instant, which is what keeps this a clean handoff rather than
      // two look-aims fighting over the same frame.
      if (percent < 82) return { target: satellitesPos, blend: 1 - (percent - 81) } // easing back out
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
      const aim = getAim(
        progress.percent,
        SATURN_POSITION,
        MARS_POSITION,
        CONSTELLATIONS_POSITION,
        ASTEROIDS_POSITION,
        SATELLITES_POSITION,
        JUPITER_POSITION,
        EARTH_POSITION,
      )

      if (aim.target) {
        // "If the camera were sitting exactly where it is right now,
        // what orientation would point it at this body?" - recomputed
        // every frame because the camera's own position (from the
        // weave above) is different every frame too.
        aimScratch.position.copy(camera.position)
        aimScratch.lookAt(aim.target)

        // A quaternion and its exact negative (-x, -y, -z, -w)
        // represent the EXACT SAME orientation. The blend below always
        // starts from "neutralOrientation," which is fixed at
        // identity - and the dot product of identity with any
        // quaternion is just that quaternion's own w value. So as this
        // body-facing orientation smoothly rotates past 180 degrees
        // from straight-ahead (a real thing that happens here - the
        // camera looks almost backward at one point during the
        // asteroids' release), its w value smoothly crosses zero.
        // That's a real, continuous rotation - but THREE's slerp
        // picks its "shortest path" using that same dot product, so
        // the exact moment w crosses zero, slerp flips which side it
        // blends from, and the BLENDED result snaps hard even though
        // neither the raw orientation nor the blend amount actually
        // jumped. (Confirmed directly: the quaternion similarity
        // between one frame and the next measured -0.35 at that exact
        // point, instead of the ~1.0 every other frame showed.)
        //
        // The fix: always keep this orientation's w component
        // positive (flipping to its exact-equivalent negative when
        // it's not) BEFORE it ever reaches the slerp call. That keeps
        // it permanently on the "close to identity" side, so slerp
        // never has a reason to flip mid-blend.
        const fresh = aimScratch.quaternion
        if (fresh.w < 0) {
          bodyOrientation.set(-fresh.x, -fresh.y, -fresh.z, -fresh.w)
        } else {
          bodyOrientation.copy(fresh)
        }
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
