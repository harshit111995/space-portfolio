// ===================================================================
// CERTIFICATEPANELS.JS
// This file is what makes the 8 certificate constellations at the
// certificates stop actually clickable. Click one, and its
// certificate panel fades in; click a different one, and the panel
// switches to that issuer instead; click empty space, and whatever
// panel is open closes. Only ever ONE panel is open at a time.
//
// This is a genuinely different kind of interaction from every other
// stop in this project: every other stop's content reveals itself
// automatically, once, as the visitor scrolls to it (see
// src/motion/statsCounter.js and its siblings for that pattern). This
// one instead waits for a deliberate click, can be opened and closed
// repeatedly, and needs to know WHICH of 8 things was clicked - so it
// gets its own, separate setup here rather than reusing any of those
// "reveal once" files.
// ===================================================================

import ScrollTrigger from 'gsap/ScrollTrigger'
import { animate } from 'animejs'
import { prefersReducedMotion } from '../motion/reducedMotion.js'

export function initCertificatePanels(camera, constellations) {
  // How close (in real on-screen pixels) the cursor needs to be to a
  // constellation's center for a click/hover to count as landing on
  // it. Generous enough that a visitor doesn't need pixel-perfect
  // aim at a tiny star, small enough that two different
  // constellations can never both claim the same click.
  const HIT_RADIUS_PX = 70

  // ---- Finding which constellation (if any) is under the cursor -----------
  // This works entirely in 2D, on-screen pixels - NOT by shooting a 3D
  // ray into the stars/lines themselves (an earlier version of this
  // file did exactly that, using THREE's Raycaster). That approach
  // was dropped after testing found it genuinely picking the WRONG
  // neighboring constellation sometimes: a ray can pass close to
  // several stars' rough 3D neighborhoods at once from this stop's
  // particular camera angle, and whichever one the ray happens to
  // reach FIRST in 3D depth wins - which doesn't always match which
  // one the visitor can actually SEE closest to their cursor.
  // Projecting each constellation's real position onto the screen and
  // comparing plain on-screen distance instead always agrees with
  // what's visually closest, which is what actually matters for a
  // click.
  function getNearestConstellation(clientX, clientY) {
    let nearest = null
    let nearestDistance = Infinity

    for (const group of constellations) {
      // .project(camera) turns a 3D world position into a position
      // from -1 to 1 on each axis (with -1,-1 at the bottom-left of
      // the screen) - the two lines below convert that into normal
      // pixel coordinates, the same units as clientX/clientY.
      const projected = group.position.clone().project(camera)
      const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth
      const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight

      // projected.z > 1 means this constellation is actually BEHIND
      // the camera right now - it would still math out to SOME
      // on-screen position, even though nothing is really visible
      // there, so it needs to be explicitly skipped.
      if (projected.z > 1) continue

      const distance = Math.hypot(clientX - screenX, clientY - screenY)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = group
      }
    }

    return nearestDistance <= HIT_RADIUS_PX ? nearest : null
  }

  // ---- Is the certificates stop even the one being viewed right now? -----
  // Constellations sit in a fixed spot in 3D space the whole time, but
  // clicking on them should obviously only do anything while the
  // camera is actually parked here looking at them - not from some
  // other stop. Rather than re-figuring out this stop's percent range
  // a second time, this reads the answer straight from the SAME real
  // ScrollTrigger pin that already freezes the camera here (see
  // src/motion/scrollTimeline.js) - ScrollTrigger keeps its own
  // "isActive" flag current on every trigger, live, so this is always
  // accurate without this file needing to know anything about
  // percents at all.
  function isCertificatesStopActive() {
    const trigger = ScrollTrigger.getAll().find(
      (scrollTrigger) => scrollTrigger.trigger && scrollTrigger.trigger.id === 'pin-constellations' && scrollTrigger.pin,
    )
    return !!trigger && trigger.isActive
  }

  // ---- Cursor feedback: pointer over a clickable constellation -----------
  window.addEventListener('mousemove', (event) => {
    if (!isCertificatesStopActive()) {
      // Not at this stop - make sure the cursor isn't stuck as a
      // pointer from the last time it was.
      document.body.style.cursor = 'default'
      return
    }
    document.body.style.cursor = getNearestConstellation(event.clientX, event.clientY) ? 'pointer' : 'default'
  })

  // ---- Showing/hiding one panel --------------------------------------------
  let openPanel = null

  function animatePanel(panel, opening) {
    if (opening) {
      panel.style.visibility = 'visible'
      panel.style.pointerEvents = 'auto'
    }

    // Reduced motion: skip the fade/pop animation entirely and jump
    // straight to the finished state - a visitor with this setting on
    // still gets fully working, instantly-openable panels, just
    // without the animated transition.
    if (prefersReducedMotion) {
      panel.style.opacity = opening ? 1 : 0
      panel.style.transform = 'none'
      if (!opening) {
        panel.style.visibility = 'hidden'
        panel.style.pointerEvents = 'none'
      }
      return
    }

    animate(panel, {
      opacity: opening ? [0, 1] : [1, 0],
      scale: opening ? [0.96, 1] : [1, 0.96],
      duration: opening ? 350 : 200,
      ease: opening ? 'outCubic' : 'inCubic',
      onComplete: () => {
        // Only clean up the CLOSING panel's hidden state after its
        // fade-out has actually finished playing - hiding it
        // instantly here would cut the animation off early.
        if (!opening) {
          panel.style.visibility = 'hidden'
          panel.style.pointerEvents = 'none'
        }
      },
    })
  }

  function showPanel(issuerName) {
    const panel = document.querySelector(`.certificate-panel[data-issuer="${issuerName}"]`)
    if (!panel || panel === openPanel) return // no matching panel, or it's already the one open - nothing to do

    if (openPanel) {
      animatePanel(openPanel, false)
    }
    openPanel = panel
    animatePanel(panel, true)
  }

  function closeOpenPanel() {
    if (!openPanel) return
    animatePanel(openPanel, false)
    openPanel = null
  }

  // ---- The actual click handling -------------------------------------------
  window.addEventListener('click', (event) => {
    if (!isCertificatesStopActive()) return

    // Whichever constellation is nearest ALWAYS wins first, even if
    // the click visually landed on top of the open panel - the open
    // panel is a big, centered box, and testing found it can end up
    // sitting right over a DIFFERENT constellation's on-screen spot.
    // Checking "did this land on a constellation" before "did this
    // land on the panel" is what lets clicking a different
    // constellation switch panels correctly, even when it's
    // positioned underneath the one currently open.
    const hit = getNearestConstellation(event.clientX, event.clientY)
    if (hit) {
      showPanel(hit.userData.name)
      return
    }

    // No constellation was near this click. If it landed on the open
    // panel itself (selecting some of its text, scrolling a long
    // list, etc), just let that happen normally - don't treat it as
    // "clicked empty space" and close the very panel being read.
    // Anywhere else genuinely IS empty space, so close whatever's open.
    if (event.target.closest('.certificate-panel')) return
    closeOpenPanel()
  })
}
