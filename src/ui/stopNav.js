// ===================================================================
// STOPNAV.JS
// Builds the fixed navigation bar that sits on the right edge of the
// screen the whole time - one entry per stop on the journey (About,
// Entrepreneur, Experience, ...), each showing a small dot plus its
// section name. Clicking one smooth-scrolls straight to that stop;
// whichever stop the visitor is currently at stays highlighted, so
// this bar always doubles as a "you are here" indicator too.
//
// IMPORTANT - an earlier version of this file broke the whole camera
// journey (it played backwards) by creating an extra ScrollTrigger of
// its own just to track scroll position for the highlight. This
// version deliberately does NONE of that:
//   - it never calls ScrollTrigger.create() - not once, anywhere
//   - it never creates a second Lenis instance - it only ever uses
//     the ONE already exported from src/motion/lenis.js
//   - it never touches #app, any pin element, or scrollTimeline.js
//   - the only ScrollTrigger-related thing this file does at all is
//     READ each stop's already-existing pin position, ONCE, when the
//     page first loads - it never asks ScrollTrigger anything again
//     after that
// Every stop's real scroll position is measured ONCE, right when the
// page loads, and just remembered from then on in the STOPS list
// below - "current stop" while scrolling is worked out entirely from
// that remembered list plus the live scroll position, never by
// re-asking ScrollTrigger or creating anything new.
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
  // ---- Reading each stop's real scroll position, ONCE ----------------------
  // Every stop already has its own real ScrollTrigger with an
  // already-measured start pixel by the time this function runs (see
  // src/motion/scrollTimeline.js - initScrollTimeline() has already
  // set all 10 up - see main.js for the call order). This just READS
  // that existing value straight off it - it does not create, modify,
  // or refresh any ScrollTrigger, and it only does this lookup ONE
  // time right here, not repeatedly later. From this point on, every
  // stop's target Y lives as a plain number on its own STOPS entry -
  // nothing below this block ever calls ScrollTrigger again.
  //
  // This used to also require "scrollTrigger.pin" to be true, back
  // when every single stop was a real, page-freezing pin. Case Studies
  // (venus) no longer is one (see the big comment on "naturalHeight"
  // in scrollTimeline.js) - its own ScrollTrigger only ever MEASURES
  // where its content naturally sits, it never pins anything - so
  // requiring ".pin" here would have silently broken the "Case
  // Studies" nav button, making it un-clickable. Matching by id alone
  // is just as safe: each "#pin-<id>" element only ever has ONE
  // ScrollTrigger of its own pointed straight at it (the crossfade
  // ScrollTrigger some stops also have, in src/motion/scrollCards.js,
  // is set up with plain numeric start/end values instead of pointing
  // at a DOM element at all, so it can never accidentally match here).
  const stops = STOPS.map((stop) => {
    const trigger = ScrollTrigger.getAll().find(
      (scrollTrigger) => scrollTrigger.trigger && scrollTrigger.trigger.id === `pin-${stop.id}`,
    )
    return { ...stop, targetY: trigger ? trigger.start : null }
  })

  // ---- Building the bar and its 10 buttons --------------------------------
  // A real <nav> with real <button>s (not, say, plain clickable <div>s)
  // so this is properly usable by keyboard (Tab between items, Enter/
  // Space to activate) and announced sensibly by screen readers, not
  // just usable with a mouse.
  const nav = document.createElement('nav')
  nav.className = 'stop-nav'
  nav.setAttribute('aria-label', 'Jump to section')

  const items = stops.map((stop) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'stop-nav-item'
    // The dot is purely decorative - the button's own aria-label
    // carries the real, readable section name, so a screen reader
    // announces "Experience", not "dot, Experience" or nothing at all
    // if the label text is ever hidden visually (see the mobile,
    // dots-only styling in src/styles/stopNav.css).
    button.setAttribute('aria-label', stop.label)
    button.innerHTML = `
      <span class="stop-nav-dot" aria-hidden="true"></span>
      <span class="stop-nav-label">${stop.label}</span>
    `
    nav.appendChild(button)
    return { ...stop, button }
  })

  document.body.appendChild(nav)

  // ---- Clicking an item: jump to that stop ----------------------------------
  items.forEach(({ targetY, button }) => {
    button.addEventListener('click', () => {
      if (targetY === null) return // that stop's pin wasn't found (shouldn't normally happen)

      if (prefersReducedMotion || !lenis) {
        // Reduced motion (or Lenis skipped entirely, which happens for
        // the exact same reduced-motion reason - see
        // src/motion/lenis.js): jump there instantly, with no eased
        // scroll animation to play. A plain window.scrollTo - not
        // Lenis, not ScrollTrigger - is all this is.
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
  // "Current stop" is whichever one's own remembered targetY is the
  // LATEST one at or before however far the visitor has scrolled -
  // that keeps exactly one item highlighted continuously, including
  // while scrolling through the plain runway gap BETWEEN two pins (see
  // ".pin-runway" in index.html), not only while a pin is actively
  // held. This only ever reads the "scrollY" number handed to it - it
  // never asks ScrollTrigger or the DOM anything else.
  function updateActiveItem(scrollY) {
    let current = items[0]
    for (const item of items) {
      if (item.targetY !== null && item.targetY <= scrollY) {
        current = item
      }
    }
    items.forEach(({ button }) => button.classList.toggle('is-active', button === current.button))
  }

  // Watching scroll position WITHOUT a ScrollTrigger of its own -
  // exactly the constraint this file has to respect. When Lenis is
  // running, its own 'scroll' event already fires on every frame it
  // moves the page (see src/motion/lenis.js) - listening to that
  // directly is simpler and cheaper than creating any separate
  // watcher. Under reduced motion, Lenis is never created at all (see
  // lenis.js), so a plain, ordinary "scroll" event on the window
  // itself does the exact same job instead - passive: true tells the
  // browser this listener will never call preventDefault(), which
  // lets it keep scrolling smoothly without waiting on this code.
  if (lenis) {
    lenis.on('scroll', ({ scroll }) => updateActiveItem(scroll))
  } else {
    window.addEventListener('scroll', () => updateActiveItem(window.scrollY), { passive: true })
  }

  // Set the correct starting highlight immediately - covers a visitor
  // loading the page already scrolled down (a refresh, or arriving via
  // a link with a saved scroll position) instead of waiting for the
  // first scroll event to fire before anything lights up.
  updateActiveItem(window.scrollY)
}
