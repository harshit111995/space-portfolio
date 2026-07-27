// ===================================================================
// EDUCATIONREVEAL.JS
// This file fades and lifts the 3 education entries into place, once,
// right as the visitor arrives at the education/asteroids stop.
//
// Same split as src/motion/statsCounter.js and
// src/motion/testimonialsReveal.js: anime.js does the actual
// fade/rise animation; GSAP's ScrollTrigger is only used to know WHEN
// to start it. ScrollTrigger and its smooth-scroll setup (Lenis) were
// already switched on in src/motion/lenis.js - this file just reuses
// that same plugin registration, it does NOT create a second Lenis
// instance or register the plugin again.
// ===================================================================

import { animate } from 'animejs'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion.js'

export function initEducationReveal() {
  const entries = document.querySelectorAll('#pin-asteroids .education-entry')
  if (entries.length === 0) return

  // ---- Reduced motion: skip the fade/rise, show the entries immediately --
  // A fade combined with a rising motion is exactly the kind of thing
  // this setting asks to avoid, so it's skipped entirely - the 3
  // entries just appear in their finished, fully-visible position
  // right away instead of animating into it.
  if (prefersReducedMotion) {
    entries.forEach((entry) => {
      entry.style.opacity = 1
      entry.style.transform = 'none'
    })
    return
  }

  // Otherwise, the entries stay in their hidden starting state (see
  // the "opacity: 0" / "transform: translateY(24px)" rule on
  // ".education-entry" in src/styles/content.css) until this
  // ScrollTrigger below actually fires - so a visitor who lands
  // further down the page and scrolls back UP never sees them already
  // sitting there before actually reaching this stop.

  // Fires the reveal exactly once, right as the asteroids stop's own
  // camera pin engages - "top top" here is the same trigger point
  // src/motion/scrollTimeline.js uses to freeze the camera on this
  // stop, so the panel animates in at the same moment this stop
  // actually becomes the one being viewed. once: true tells
  // ScrollTrigger to run this a single time and then fully forget
  // about it - scrolling away and back later does NOT replay the
  // reveal a second time.
  ScrollTrigger.create({
    trigger: '#pin-asteroids',
    start: 'top top',
    once: true,
    onEnter: () => {
      animate(entries, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 800,
        delay: (_el, i) => i * 150, // each entry lifts in slightly after the previous one, instead of all 3 snapping in at once
        ease: 'outCubic',
      })
    },
  })
}
