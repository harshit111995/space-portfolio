// ===================================================================
// SCROLLTIMELINE.JS  (v2 cinematic spine)
// This file connects scrolling to the camera's position AND where it
// looks. As you scroll down the page, the camera flies backward
// through the 3D scene, stopping at 10 bodies along the way.
//
// It uses GSAP's ScrollTrigger to "scrub" the animation: instead of
// playing on its own, the animation's progress is tied directly to
// how far down the page you've scrolled. ScrollTrigger was already
// switched on and connected to the smooth-scroll setup in
// src/motion/lenis.js - this file just reuses that, it doesn't set
// any of that up again.
//
// ---- How the journey got here ------------------------------------------
// This file went through several earlier shapes before landing on the
// one below - worth knowing, because a couple of those earlier
// attempts are the reason certain things here are built the way they
// are, not just "because":
//
//   Straight line, hand-tweened banking -> a body off to the side
//   would flash past almost unseen, and a body sitting close to the
//   camera's straight line risked the camera flying nearly INTO it.
//
//   S-curve flyby with a wandering look-target point -> fixed the
//   above (the camera weaves out to the side opposite each body, and
//   actively turns to face it using a quaternion slerp instead of
//   easing a plain point, which is what makes the turning itself feel
//   smooth instead of lurching - see the big comment further down by
//   aimScratch/bodyOrientation for exactly why a point doesn't work).
//
//   Two real PARKS proven on Saturn and Mars -> a flyby (swing past,
//   keep moving) doesn't work once a stop needs to hold content still
//   long enough to read it. A genuine PARK - arrive, freeze position
//   AND orientation completely, hold, depart - was built and checked
//   thoroughly on just these two bodies first, using a real
//   ScrollTrigger pin on a DOM element to freeze the actual page
//   underneath the camera too (freezing the camera alone, with
//   nothing pinning the page, would mean the backdrop stops moving
//   while the page keeps scrolling normally past it underneath -
//   backwards from what a parked moment needs).
//
// ---- This version: every one of the 10 stops is now a park --------------
// The proven Saturn/Mars model is now applied to all 10 stops evenly:
// weave in -> arrive -> freeze (position AND look-orientation both
// completely still) across a real pinned hold -> depart, weaving
// toward the next one. The old "flyby swing past while still moving"
// shape is retired everywhere, not just on two bodies - every stop
// gets an actual DOM pin (see index.html's 10 #pin-* markers) with its
// own hold length, and the gaps between them are one consistent, even
// weave rhythm rather than the old hand-tuned per-body arc waypoints.
//
// Pinning inserts extra scroll distance into the page for every one of
// these 10 holds (see pinSpacing in setupParkedStop()) - the whole
// point of a park is that it consumes real scroll length while the
// camera does nothing. This file measures the REAL pixel size of every
// pin (via GSAP, after creating all 10 and letting it refresh) and
// converts those measurements into percentages of the page's real
// total scroll length, rather than guessing fixed percent numbers by
// hand - the actual on-screen hold length for each body is set once,
// in one place (HOLD_LENGTH_VH below), and everything else derives
// from real, measured numbers instead of hand-picked ones that could
// drift out of sync with how tall the page actually is.
// ===================================================================

import * as THREE from 'three'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
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
// right now, never to zero and never compounding on itself. This is
// exactly how drag-to-look keeps working even while parked: the park
// only ever touches this "base" value, and cursor.js's own offset
// still layers on top of it completely independently.
export const lookBaseRotation = { x: 0, y: 0 }

// ---- The 10 stops along the journey -----------------------------------
// Everything about every stop lives in this one list - its real 3D
// position (matching wherever its actual body was built - see the
// matching src/scene/*.js file noted per entry), where the camera
// PARKS to frame it, and how long (in screen-heights of scroll) its
// hold lasts.
//
// The parked camera spot is deliberately chosen to sit at the exact
// same Z depth (front-to-back distance) as the body itself, offset
// only sideways (x/y) - a clean, level, sideways-on shot. This is the
// same singularity-avoidance trick proven on Saturn/Mars: looking
// along a PURE sideways direction, with zero up/down tilt, can never
// hit the "looking almost straight up or down" degenerate case that
// the camera's look-at math is unstable around (see the big comment
// on bodyOrientation further down for what that instability actually
// looks like). Every single park below follows this same rule.
//
// The sideways offsets also alternate which side they swing to
// (positive-x/negative-y, then negative-x/positive-y, then back)
// stop to stop, so the camera weaves left-right-left down the whole
// journey rather than drifting to one side and staying there.
//
// Distances (how far the parked camera sits from the body) are scaled
// to each body's own size/importance: the big, dramatic planets
// (Saturn, Jupiter, Earth) sit around 35-40 units out; the smaller
// clusters (asteroids, satellites, the testimonials placeholder, the
// small moon) sit around 20-30; the constellation FIELD (many stars
// spread wide, not one small object) sits back around 50 so the whole
// field reads at once. Mars and Venus reuse distances already tuned
// for them in earlier versions of this file.
//
// holdLengthVh is in "screen-heights of scroll" (1 = one full
// viewport-height of scrolling) - NOT a percent. Percent is a moving
// target that depends on how tall the WHOLE page ends up (which
// changes as pins are added), so every hold is defined here in a
// fixed, real unit instead, and turned into percent further down once
// the actual page height is known.
const BODIES = [
  {
    id: 'moon', // src/scene/moon.js - the small moon near the start
    position: new THREE.Vector3(0, -3.2, 0),
    park: { x: 13, y: -16.2 }, // ~18.4 units out - small object, close-up
    holdLengthVh: 1.972,
    marker: false,
  },
  {
    id: 'saturn', // src/scene/saturn.js
    position: new THREE.Vector3(8, -8, -20),
    park: { x: -18, y: 18 }, // ~36.8 units out - reused from the Saturn/Mars proof phase
    // 1.5vh = 3 entrepreneur cards (see src/motion/scrollCards.js) x
    // ~0.5 screen-heights of scroll each - was 1.16vh, which testing
    // found flipped through the 3 cards too fast to comfortably read.
    holdLengthVh: 1.5,
    marker: false,
  },
  {
    id: 'mars', // src/scene/planets.js
    position: new THREE.Vector3(-10, 1, -50),
    park: { x: 12, y: -11 }, // ~25.1 units out - reused from the Saturn/Mars proof phase
    // 4.5vh = 9 experience cards (not built yet - this stop will reuse
    // the same scroll-card pattern proven on Saturn) x ~0.5
    // screen-heights each, matching Saturn's own per-card pacing.
    holdLengthVh: 4.5,
    marker: false,
  },
  {
    id: 'venus', // src/scene/planets.js
    position: new THREE.Vector3(-10, -2, -80),
    park: { x: -34, y: 12 }, // ~27.8 units out
    // 6.0vh = 12 case-study cards (not built yet, same reasoning as
    // Mars above) x ~0.5 screen-heights each - the longest hold, since
    // it's also the stop with the most cards to get through.
    holdLengthVh: 6.0,
    marker: false,
  },
  {
    id: 'constellations', // src/scene/constellations.js - center of the whole field
    position: new THREE.Vector3(-10, 0, -110),
    park: { x: 25, y: -35 }, // ~49.5 units out - pulled back further so the wide field reads at once
    // 4.0vh = 8 certificate cards (see src/motion/scrollCards.js) x
    // ~0.5 screen-heights of scroll each, same per-card pacing as
    // every other card stop - was 1.479vh, back when this stop was a
    // click-to-reveal panel instead of a scroll-card stop.
    holdLengthVh: 4.0,
    marker: false,
  },
  {
    id: 'asteroids', // src/scene/asteroids.js - center of the 3-asteroid cluster
    position: new THREE.Vector3(10, -1, -139),
    park: { x: -10, y: 14 }, // ~25 units out
    holdLengthVh: 0.986,
    marker: false,
  },
  {
    id: 'satellites', // src/scene/satellites.js - center of the satellite ring
    position: new THREE.Vector3(-10, 0, -170),
    park: { x: 8, y: -20 }, // ~26.9 units out
    holdLengthVh: 1.479,
    marker: false,
  },
  {
    id: 'jupiter', // src/scene/jupiter.js
    position: new THREE.Vector3(14, -10, -200),
    park: { x: -11, y: 18 }, // ~37.5 units out
    // 1.5vh = 3 volunteering cards (not built yet, same reasoning as
    // Mars/Venus above) x ~0.5 screen-heights each, same as Saturn's
    // own 3-card pacing.
    holdLengthVh: 1.5,
    marker: false,
  },
  {
    id: 'testimonials', // src/scene/mercury.js
    position: new THREE.Vector3(-10, 0, -230),
    park: { x: 8, y: -16 }, // ~24.1 units out
    holdLengthVh: 0.986,
    marker: false,
  },
  {
    id: 'earth', // src/scene/planets.js
    position: new THREE.Vector3(5, -3, -260),
    park: { x: -22, y: 27 }, // ~40.4 units out
    holdLengthVh: 1.479,
    marker: false,
  },
]

// ---- Temporary placeholder marker --------------------------------------
// A small wireframe box for any stop that doesn't have a real body
// built yet, so the spine's spacing can still be SEEN there before its
// real content exists. Every stop now has a real body (testimonials'
// own placeholder was replaced by Mercury - see src/scene/mercury.js),
// so this currently draws nothing at all - left in place for whenever
// a future stop is added without its real body ready yet.
function addPlaceholderMarkers(bodies) {
  const markerGeometry = new THREE.BoxGeometry(6, 6, 6)
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x6fb7ff,
    wireframe: true,
  })

  for (const body of bodies) {
    if (!body.marker) continue // a real body already occupies this stop
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.copy(body.position)
    sceneApi.scene.add(marker)
  }
}

// ---- Setting up one real, pinned "park" -----------------------------------
// This is the piece that makes each hold GENUINELY still, not just
// "the camera's own numbers happen to stay the same." It pins a real
// DOM element (elementId) - freezing that section on screen - for a
// real, explicit amount of scroll distance (holdLengthPx).
//
// refresh() runs again immediately after EVERY single pin is created,
// not just once at the very end after all 10 exist. This turned out to
// matter a lot: with 10 markers that each have real, visible content
// (min-height: 100vh, so their text can be centered nicely on screen),
// creating all 10 pins first and refreshing only once afterward left
// each pin measuring the NEXT marker's position against a page that
// hadn't fully "settled" yet - GSAP hadn't yet finished converting the
// previous marker's own natural height into its pin's reserved scroll
// space, so every marker's actual position ended up exactly one extra
// screen-height too far down the page (confirmed directly: a
// diagnostic print showed every gap between stops measuring double its
// intended size). Refreshing right after each one is created gives
// GSAP a chance to fully settle that marker's spacing before moving on
// to measure the next one, which is what makes every stop's timing
// come out exactly as intended.
function setupParkedStop(elementId, holdLengthPx) {
  const trigger = ScrollTrigger.create({
    trigger: `#${elementId}`,
    start: 'top top',
    // "+=N" means "N pixels of scroll AFTER reaching the pin start" -
    // this is the actual, real hold length. pinSpacing: true is what
    // makes the page insert that same amount of extra empty space
    // right after this element, so nothing later on the page jumps
    // when the pin eventually releases.
    end: `+=${holdLengthPx}`,
    pin: true,
    pinSpacing: true,
  })
  ScrollTrigger.refresh()
  return trigger
}

export function init(camera) {
  // ---- Pin all 10 stops, settling each one's spacing before the next ------
  // Pins are created REGARDLESS of reduced motion - freezing the page
  // content so a visitor can read it without it sliding away is a
  // readability aid, not the kind of motion "reduce motion" asks to
  // avoid. Only the camera's off-axis framing/turning (built further
  // below) is skipped under reduced motion, same as before.
  const pinTriggers = BODIES.map((body) =>
    setupParkedStop(`pin-${body.id}`, body.holdLengthVh * window.innerHeight),
  )

  // One more refresh after all 10 exist, so the percentages read below
  // reflect the fully-finished page exactly as a visitor would load it.
  ScrollTrigger.refresh()

  // The master timeline below is scrubbed across the FULL page, from
  // the top of #app to the bottom - so "percent" always means
  // "percent of this same total distance." Measuring that same total
  // AFTER all 10 pins exist (their pinSpacing has already made the
  // page taller by this point) is what makes the percent conversion
  // below line up exactly with what the master timeline itself uses.
  const totalScrollRange = document.getElementById('app').scrollHeight - window.innerHeight

  function pxToPercent(px) {
    return (px / totalScrollRange) * 100
  }

  // Fold each body's real, measured hold boundary (in percent) in
  // alongside the rest of its info from the BODIES list above.
  //
  // holdEnd is capped at 100 here - this matters specifically for
  // Earth, the very last body. Earth has nothing after it, so its pin
  // can end up needing SLIGHTLY more scroll room than the page
  // actually has left to give (see the diagnostic log further down for
  // the full explanation) - its true, measured holdEnd can come out
  // as something like 103.57% instead of a clean 100%. That's fine on
  // its own, but every z-position and weave tween further below is
  // built by using these hold numbers directly as positions ALONG the
  // camera's own timeline - and that timeline is stretched by GSAP so
  // that scrolling through the real page (0-100%) always plays out
  // its FULL length, whatever that length happens to be. If Earth's
  // entry were left at 103.57 instead of 100, the camera's timeline
  // would end up 3.57% "longer" than the real page - and GSAP would
  // then squeeze that extra length back down to fit the real 0-100%
  // scroll range, which quietly shifts EVERY stop's actual on-screen
  // timing earlier than intended (testing caught this directly: by
  // Jupiter's stop, its held text and its camera framing had visibly
  // drifted out of sync with each other). Capping at 100 keeps the
  // camera's timeline exactly as long as the real page, so nothing
  // downstream needs to be squeezed. It doesn't change what the camera
  // actually does at Earth - both of Earth's tweens (see the z-position
  // and weave loops below) already move the camera to the exact same
  // spot, so trimming WHEN the second one nominally finishes doesn't
  // change WHERE the camera ends up.
  const bodies = BODIES.map((body, index) => ({
    ...body,
    holdStart: pxToPercent(pinTriggers[index].start),
    holdEnd: Math.min(pxToPercent(pinTriggers[index].end), 100),
  }))

  addPlaceholderMarkers(bodies)

  // ---- DIAGNOSTIC LOGGING (temporary - safe to delete once the page's
  // length is sorted out) --------------------------------------------------
  // This only PRINTS numbers to the browser console - it doesn't move,
  // resize, or change anything about the page. The goal is to see
  // exactly how many real pixels each piece of the journey turned out
  // to be, so an unexpectedly large segment can be spotted directly
  // instead of guessed at.
  //
  // Two kinds of segment make up the whole page:
  //   - a PIN HOLD (how long the camera stays frozen on one body) -
  //     these are set directly from holdLengthVh above, so they should
  //     match that intended number exactly.
  //   - a RUNWAY (the plain .pin-runway spacer before each pin, see
  //     index.html) - every one of these is meant to be exactly one
  //     screen-height (100vh in CSS, i.e. window.innerHeight in px).
  //     "runway before moon" is the gap from the very top of the page
  //     to Moon's pin; the very last line below ("trailing content
  //     after Earth's pin") is everything left over AFTER Earth's
  //     hold ends - that includes the one extra runway added to stop
  //     the old placeholder text bleeding into Earth's frame, PLUS
  //     that placeholder text's own real (un-forced) height, all
  //     added together as one number since nothing currently tells
  //     them apart on the page itself.
  {
    const vh = window.innerHeight
    console.log(`--- Pin/runway diagnostic breakdown (1 viewport-height = ${vh}px) ---`)

    let previousEndPx = 0
    bodies.forEach((body, index) => {
      const trigger = pinTriggers[index]
      const runwayPx = trigger.start - previousEndPx
      const holdPx = trigger.end - trigger.start
      console.log(
        `runway before ${body.id}: ${runwayPx.toFixed(0)}px = ${(runwayPx / vh).toFixed(3)}vh (intended ~1.000vh)`,
      )
      console.log(
        `${body.id} hold: ${holdPx.toFixed(0)}px = ${(holdPx / vh).toFixed(3)}vh (intended ${body.holdLengthVh.toFixed(3)}vh)`,
      )
      previousEndPx = trigger.end
    })

    const appScrollHeight = document.getElementById('app').scrollHeight
    const trailingPx = appScrollHeight - previousEndPx
    console.log(
      `trailing content after Earth's pin: ${trailingPx.toFixed(0)}px = ${(trailingPx / vh).toFixed(3)}vh ` +
        `(anything left over after Earth's own hold ends - should be 0, since nothing comes after it)`,
    )
    console.log(`total #app scrollHeight: ${appScrollHeight}px = ${(appScrollHeight / vh).toFixed(3)}vh`)

    // A note on why this next number can read OVER 100%: Earth is the
    // very last stop, with nothing after it, so its pin's own end
    // point sits exactly at the bottom of the whole page. But the
    // camera's own 0-100% scale (see the master timeline further
    // below) is measured up to the LAST point a visitor can actually
    // scroll to, which is always one screen-height SHORT of the
    // page's absolute bottom edge (you can't scroll a screen-height
    // "into" content that isn't there). So Earth's pin technically
    // asks for slightly more scroll room than a visitor can ever
    // provide - which isn't a bug, it just means Earth simply never
    // lets go: the moment a visitor hits the true bottom of the page,
    // they're still within Earth's hold, still perfectly parked on
    // it, exactly as a "final destination" should behave.
    //
    // This reads the true, UNCAPPED number straight from Earth's own
    // pin trigger, purely for this printout - the "bodies" list used
    // everywhere else caps this same number at 100 before the camera
    // timeline is built from it (see the big comment where "bodies" is
    // put together, above), which is what actually keeps every stop's
    // timing correct. This log line stays uncapped deliberately, so it
    // keeps showing the real, honest number instead of hiding it.
    const earthTrigger = pinTriggers[pinTriggers.length - 1]
    const trueEarthHoldEndPercent = pxToPercent(earthTrigger.end)
    console.log(
      `Earth hold ends at ${trueEarthHoldEndPercent.toFixed(2)}% of total scroll ` +
        `(reads over 100% because nothing follows it - see the comment above this line; ` +
        `in practice this means Earth simply holds all the way to the true end of the page)`,
    )
  }

  // How many percentage points of gentle approach/departure surround
  // each hold - the same idea as an "ease in / hold / ease out" shape.
  // The gap between one hold ending and the next beginning is about
  // one screen-height of scroll everywhere (see the .pin-runway
  // spacers in index.html), which works out to roughly 3-3.5% of the
  // total page - EASE_MARGIN is kept comfortably under half of that,
  // so an ease-out and the next ease-in never overlap, with a little
  // "straight ahead" gap left over in between.
  //
  // 1.3 rather than a rounder number like 1.5: testing found a brief,
  // small wobble during Venus's departure, right near the very tail
  // end of its ease-out (~98% of the way through it, when its look-aim
  // blend was already down near 5%). The cause wasn't a bug in the
  // blending itself - it's a real moment where the transiting camera's
  // straight-ahead direction happens to pass almost exactly through
  // Venus's own bearing, which makes "which way to turn to face it"
  // become briefly ill-defined (the turn angle needed approaches
  // zero, so the exact axis to turn around gets noisy) - the same
  // family of issue as the near-vertical/near-180 cases elsewhere in
  // this file, just the "near-zero" version of it. Since it only
  // shows up this late in the ease-out, when blend is already nearly
  // 0 anyway, shortening the margin slightly so blend reaches exactly
  // 0 BEFORE that crossing point avoids it entirely - once blend is 0,
  // the target doesn't matter at all, so it can't matter that this
  // one particular target briefly gets confused about which way to
  // turn.
  const EASE_MARGIN = 1.3

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
  // scroll percentage 1-to-1. For every body: ease forward from
  // wherever the camera currently is to this body's own depth,
  // arriving exactly at holdStart - then a SECOND tween to the exact
  // same depth, running from holdStart to holdEnd. Two tweens to the
  // identical value back to back is just a plain, flat, unmoving hold
  // - that's the entire trick behind the "genuinely frozen" position
  // requirement, no special "pause the timeline" logic needed
  // anywhere. Then the next body's approach continues on from there.
  timeline.set(camera.position, { z: 10 })

  let atZPercent = 0
  for (const body of bodies) {
    timeline.to(camera.position, {
      z: body.position.z,
      duration: body.holdStart - atZPercent,
      ease: 'none',
    })
    atZPercent = body.holdStart

    timeline.to(camera.position, {
      z: body.position.z,
      duration: body.holdEnd - atZPercent,
      ease: 'none',
    })
    atZPercent = body.holdEnd
  }

  // Everything below (the sideways weave and the look-target aiming)
  // is skipped entirely under reduced motion: the camera still flies
  // the full journey (position.z, above), it just goes dead straight
  // with no turning, which is the calmest option for a visitor who
  // has asked their system to reduce motion. The z-position HOLD above
  // still happens either way, since that's just "the camera pauses
  // for a while," not a turn or an off-axis swing.
  if (!prefersReducedMotion) {
    // ---- The camera's sideways weave (position.x / position.y) -------------
    // Exactly the same two-tweens-to-the-same-value trick as the depth
    // (z) above, but for the sideways parked offset instead: ease from
    // the PREVIOUS body's parked spot to THIS body's parked spot,
    // arriving at holdStart, then hold flat to holdEnd. Because
    // consecutive bodies' parked spots already alternate sides (see
    // the BODIES list above), a plain direct line between them reads
    // as a natural left-right-left weave on its own - no extra
    // "swing wide" waypoints needed the way the old flyby version
    // required.
    timeline.set(camera.position, { x: 0, y: 0 }, 0)

    let atWeavePercent = 0
    for (const body of bodies) {
      timeline.to(
        camera.position,
        { x: body.park.x, y: body.park.y, duration: body.holdStart - atWeavePercent, ease: 'none' },
        atWeavePercent,
      )
      atWeavePercent = body.holdStart

      timeline.to(
        camera.position,
        { x: body.park.x, y: body.park.y, duration: body.holdEnd - atWeavePercent, ease: 'none' },
        atWeavePercent,
      )
      atWeavePercent = body.holdEnd
    }

    // ---- A single scrub-synced progress number --------------------------------
    // A plain 0-100 number that always matches the current scrubbed
    // scroll percent, kept in sync by living on this SAME timeline
    // (the same one driving position.z and the weave above). Reading
    // this every frame - instead of asking GSAP/ScrollTrigger for the
    // percent separately - guarantees the look-aim below is working
    // from the exact same smoothed, scrubbed number as everything
    // else, with no chance of it drifting out of sync.
    //
    // The duration below is NOT hardcoded to 100, even though percent
    // is a 0-100 value - it's set to match timeline.duration(), the
    // ACTUAL total length of every z-position and weave tween added
    // above. Those don't necessarily add up to exactly 100: Earth (the
    // very last body) has nothing after it, so its own hold can run
    // slightly past where a visitor can actually scroll to (see the
    // diagnostic log further up this file for why) - which means the
    // combined z/weave tweens' real total length can come out as,
    // say, 103.57 instead of a clean 100. GSAP automatically stretches
    // this WHOLE timeline so that scrolling 0-100% of the real page
    // maps onto its own true total length, whatever that is - so if
    // this one tween were left hardcoded to a duration of exactly 100
    // while the rest of the timeline actually runs to 103.57, this
    // number would tick from 0 to 100 slightly FASTER than the
    // z-position/weave tweens play out, silently drifting out of sync
    // with where the camera actually is by the end of the journey.
    // Testing caught this directly: Jupiter's held text and framing
    // were measurably out of alignment with each other by the time the
    // journey reached the later stops. Matching this tween's duration
    // to the timeline's real total length keeps it locked to the exact
    // same scale as everything else, however long that scale turns out
    // to be.
    const progress = { percent: 0 }
    timeline.to(progress, { percent: 100, duration: timeline.duration(), ease: 'none' }, 0)

    // ---- The look-aim, as an ORIENTATION, not a point ------------------------
    // Earlier versions of this file eased a plain WORLD-SPACE POINT
    // from the body's position toward a "neutral" point far down the
    // path, then called camera.lookAt() on wherever that eased point
    // currently was. That looks like a smooth change in raw numbers,
    // but is NOT a smooth change in ANGLE - a small step toward a very
    // distant point can collapse the camera's aim to "straight ahead"
    // almost immediately instead of gradually, causing a visible
    // lurch. The fix, still used here: interpolate the camera's
    // ORIENTATION directly (a quaternion slerp), which changes at a
    // constant angular speed - no snap.
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
    // a plain Object3D here would mean every computed orientation
    // faces exactly backwards.
    const aimScratch = new THREE.PerspectiveCamera()
    const bodyOrientation = new THREE.Quaternion()
    const blendedOrientation = new THREE.Quaternion()

    // Works out which body (if any) the camera should be aiming at
    // right now, and how far blended toward it we should be (0 =
    // fully neutral/straight ahead, 1 = fully locked onto the body),
    // purely from the current scrub percent.
    //
    // This walks the 10 bodies IN ORDER (the same order they appear
    // along the scroll). For each one it asks four questions, in
    // order: are we not even close to this body yet (still straight
    // ahead, or still departing the one before it)? Are we easing
    // toward it? Are we PARKED on it (blend stuck at 1 - this is the
    // true pin, and it stays exactly 1 for the body's WHOLE measured
    // hold, however long or short that real pin turns out to be)? Or
    // are we easing back out of it? The very first question returning
    // true means we've found exactly where we are in the journey, so
    // it can stop looking any further forward.
    //
    // Earth (the last body in the list) is a special case: every
    // other body eases back out toward "straight ahead" once its hold
    // ends, because there's a NEXT body to turn toward next. Earth has
    // no next body - it's the destination the whole journey has been
    // heading for - so once parked on it, the camera just stays locked
    // there for the rest of the scroll instead of easing away from it.
    // (Skipping this check found a real bug during testing: without
    // it, the ease-out would run down to blend 0 by ~99.2%, and then
    // immediately after that this function would fall off the end of
    // the loop into the "past everything" fallback below, which snaps
    // blend straight back to 1 - a hard, instant jump right near the
    // very end of the journey.)
    function getAim(percent) {
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i]
        const isFinalBody = i === bodies.length - 1

        if (percent < body.holdStart - EASE_MARGIN) {
          return { target: null, blend: 0 } // straight ahead - not yet approaching this body
        }
        if (percent < body.holdStart) {
          return { target: body.position, blend: 1 - (body.holdStart - percent) / EASE_MARGIN } // easing toward it
        }
        if (percent < body.holdEnd) {
          return { target: body.position, blend: 1 } // PARKED - the true pin
        }
        if (isFinalBody) {
          return { target: body.position, blend: 1 } // the destination - stay locked on, never ease out
        }
        if (percent < body.holdEnd + EASE_MARGIN) {
          return { target: body.position, blend: 1 - (percent - body.holdEnd) / EASE_MARGIN } // easing back out
        }
        // Past this body's entire window (including its ease-out) -
        // check the next body in line instead.
      }
      // This point in the function is actually unreachable now that
      // the final body is handled above, but is kept as a safe
      // fallback in case bodies is ever empty or reordered.
      const last = bodies[bodies.length - 1]
      return { target: last.position, blend: 1 }
    }

    sceneApi.addUpdate(() => {
      const aim = getAim(progress.percent)

      if (aim.target) {
        // "If the camera were sitting exactly where it is right now,
        // what orientation would point it at this body?" - recomputed
        // every frame because the camera's own position (from the
        // weave above) is different every frame too. During a park,
        // camera.position isn't changing at all (see the flat weave
        // hold above), so this naturally recomputes the EXACT SAME
        // orientation every single frame too - a still position
        // looking at a still target is, itself, a still orientation.
        // That's what makes the hold genuinely frozen rather than
        // just "close enough."
        aimScratch.position.copy(camera.position)
        aimScratch.lookAt(aim.target)

        // A quaternion and its exact negative (-x, -y, -z, -w)
        // represent the EXACT SAME orientation. The blend below always
        // starts from "neutralOrientation," which is fixed at
        // identity - and the dot product of identity with any
        // quaternion is just that quaternion's own w value. If a
        // body-facing orientation ever rotates past 180 degrees from
        // straight-ahead (which can happen for a body the camera has
        // traveled well past), its w value crosses zero. That's a
        // real, continuous rotation - but THREE's slerp picks its
        // "shortest path" using that same dot product, so the exact
        // moment w crosses zero, slerp flips which side it blends
        // from, and the BLENDED result snaps hard even though neither
        // the raw orientation nor the blend amount actually jumped.
        // This was confirmed directly in earlier testing (a
        // frame-to-frame quaternion similarity of -0.35 at exactly
        // this kind of crossing, instead of the usual ~1.0).
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
  // placeholder marker built above.
}
