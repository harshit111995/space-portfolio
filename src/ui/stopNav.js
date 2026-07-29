// ===================================================================
// STOPNAV.JS
// Builds the fixed navigation bar that sits on the right edge of the
// screen the whole time - one entry per stop on the journey (About,
// Entrepreneur, Experience, ...), each showing a small dot plus its
// section name. Clicking one smooth-scrolls straight to that stop;
// whichever stop the visitor is currently at stays highlighted, so
// this bar always doubles as a "you are here" indicator too.
//
// Built directly in JavaScript (like src/ui/loader.js and
// src/ui/audio.js), not written by hand in index.html - the 10 items
// are all the same shape, just with different text, which is exactly
// the kind of repeated thing that's easier and safer to generate from
// one small list (STOPS below) than to copy-paste 10 times.
// ===================================================================

import ScrollTrigger from 'gsap/ScrollTrigger'
import lenis from '../motion/lenis.js'
import { prefersReducedMotion } from '../motion/reducedMotion.js'

// Every stop, in the exact same order they appear down the page (see
// the BODIES list in src/motion/scrollTimeline.js) - "id" matches
// each stop's "pin-<id>" element in index.html, "label" is the
// plain-English name shown in the nav.
const STOPS = [
  { id: 'moon', label: 'About' },
  { id: 'saturn', label: 'Entrepreneur' },
  { id: 'mars', label: 'Experience' },
  { id: 'venus', label: 'Case Studies' },
  { id: 'constellations', label: 'Certificates' },
  { id: 'asteroids', label: 'Education' },
  { id: 'satellites', label: 'Skills' },
  { id: 'jupiter', label: 'Volunteering' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'earth', label: 'Contact' },
]

export function initStopNav() {
  // ---- Building the bar and its 10 buttons --------------------------------
  // A real <nav> with real <button>s (not, say, plain clickable <div>s)
  // so this is properly usable by keyboard (Tab between items, Enter/
  // Space to activate) and announced sensibly by screen readers, not
  // just usable with a mouse.
  const nav = document.createElement('nav')
  nav.className = 'stop-nav'
  nav.setAttribute('aria-label', 'Jump to section')

  const items = STOPS.map((stop) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'stop-nav-item'
    // The dot is purely decorative (aria-hidden) - the button's own
    // aria-label carries the real, readable section name, so a screen
    // reader announces "Experience", not "dot, Experience" or nothing
    // at all if the label text is ever hidden visually (see the
    // mobile, dots-only styling in src/styles/stopNav.css).
    button.setAttribute('aria-label', stop.label)
    button.innerHTML = `
      <span class="stop-nav-dot" aria-hidden="true"></span>
      <span class="stop-nav-label">${stop.label}</span>
    `
    nav.appendChild(button)
    return { id: stop.id, button }
  })

  document.body.appendChild(nav)

  // ---- Finding a stop's real scroll position --------------------------------
  // Every stop's pin (see src/motion/scrollTimeline.js) is a real
  // ScrollTrigger with its own already-measured start pixel -
  // reading that straight from ScrollTrigger, the same way several
  // other files in this project already do (src/motion/scrollCards.js,
  // src/ui/portrait.js), guarantees this always matches exactly where
  // the camera actually parks, instead of separately recalculating the
  // same position by hand and risking it drifting out of sync.
  function getStopScrollY(pinId) {
    const trigger = ScrollTrigger.getAll().find(
      (scrollTrigger) => scrollTrigger.trigger && scrollTrigger.trigger.id === `pin-${pinId}` && scrollTrigger.pin,
    )
    return trigger ? trigger.start : null
  }

  // ---- Clicking an item: jump to that stop ----------------------------------
  items.forEach(({ id, button }) => {
    button.addEventListener('click', () => {
      const targetY = getStopScrollY(id)
      if (targetY === null) return // that stop's pin doesn't exist (shouldn't normally happen)

      if (prefersReducedMotion || !lenis) {
        // Reduced motion (or Lenis skipped entirely, which happens for
        // the exact same reduced-motion reason - see
        // src/motion/lenis.js): jump there instantly, with no eased
        // scroll animation to play.
        window.scrollTo(0, targetY)
        return
      }

      // Reuses the SAME Lenis instance already driving the rest of the
      // page's smooth scrolling - this does NOT create a second,
      // separate smooth-scroll system of its own.
      lenis.scrollTo(targetY, { duration: 1.2 })
    })
  })

  // ---- Keeping the highlight in sync with the current scroll position -----
  // "Current stop" is whichever one's own pin has the LATEST start
  // point at or before however far the visitor has scrolled - that
  // keeps exactly one item highlighted continuously, including while
  // scrolling through the plain runway gap BETWEEN two pins (see
  // ".pin-runway" in index.html), not only while a pin is actively
  // held. A simpler approach that only lit up a stop while its OWN pin
  // is active would leave nothing highlighted at all during every one
  // of those runway stretches.
  function updateActiveItem(scrollY) {
    let current = items[0]
    for (const item of items) {
      const y = getStopScrollY(item.id)
      if (y !== null && y <= scrollY) {
        current = item
      }
    }
    items.forEach(({ button }) => button.classList.toggle('is-active', button === current.button))
  }

  // ScrollTrigger.create with plain numbers for start/end (instead of
  // a trigger ELEMENT) just watches raw scroll position directly - the
  // same technique src/motion/scrollCards.js already uses for its own
  // independent progress tracking. Because Lenis feeds ScrollTrigger
  // its updates directly (see src/motion/lenis.js), this onUpdate
  // fires in step with the smoothed scroll position, not a jumpy raw
  // one.
  ScrollTrigger.create({
    start: 0,
    end: () => document.documentElement.scrollHeight - window.innerHeight,
    onUpdate: (self) => updateActiveItem(self.scroll()),
  })

  // Set the correct starting highlight immediately - covers a visitor
  // loading the page already scrolled down (a refresh, or arriving via
  // a link with a saved scroll position) instead of waiting for the
  // first scroll event to fire before anything lights up.
  updateActiveItem(window.scrollY)
}
