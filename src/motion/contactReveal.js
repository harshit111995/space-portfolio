// ===================================================================
// CONTACTREVEAL.JS
// This file fades and lifts the contact details card into place, once,
// right as the visitor arrives at the Earth/contact stop.
//
// Same split as src/motion/statsCounter.js, testimonialsReveal.js,
// educationReveal.js, and skillsReveal.js: anime.js does the actual
// fade/rise animation; GSAP's ScrollTrigger is only used to know WHEN
// to start it. ScrollTrigger and its smooth-scroll setup (Lenis) were
// already switched on in src/motion/lenis.js - this file just reuses
// that same plugin registration, it does NOT create a second Lenis
// instance or register the plugin again.
//
// The portrait photo next to this card already has its OWN separate
// reveal (a plain fade, see src/ui/portrait.js) - that one is left
// completely alone here, this file only handles the NEW contact
// details card.
// ===================================================================

import { animate } from 'animejs'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion.js'

export function initContactReveal() {
  const card = document.querySelector('#pin-earth .contact-details')
  if (!card) return

  // ---- Reduced motion: skip the fade/rise, show the card immediately -----
  // A fade combined with a rising motion is exactly the kind of thing
  // this setting asks to avoid, so it's skipped entirely - the card
  // just appears in its finished, fully-visible position right away
  // instead of animating into it.
  if (prefersReducedMotion) {
    card.style.opacity = 1
    card.style.transform = 'none'
    return
  }

  // Otherwise, the card stays in its hidden starting state (see the
  // "opacity: 0" / "transform: translateY(24px)" rule on
  // ".contact-details" in src/styles/content.css) until this
  // ScrollTrigger below actually fires - so a visitor who lands
  // further down the page and scrolls back UP never sees it already
  // sitting there before actually reaching this stop.

  // Fires the reveal exactly once, right as Earth's own camera pin
  // engages - "top top" here is the same trigger point
  // src/motion/scrollTimeline.js (and src/ui/portrait.js, for the
  // portrait's own fade) use to freeze the camera on this stop, so
  // the card animates in at the same moment this stop actually
  // becomes the one being viewed. once: true tells ScrollTrigger to
  // run this a single time and then fully forget about it - scrolling
  // away and back later does NOT replay the reveal a second time.
  ScrollTrigger.create({
    trigger: '#pin-earth',
    start: 'top top',
    once: true,
    onEnter: () => {
      animate(card, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 800,
        ease: 'outCubic',
      })
    },
  })
}
