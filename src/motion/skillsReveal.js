// ===================================================================
// SKILLSREVEAL.JS
// This file fades and lifts the 2 skills cards (Technical Skills,
// Soft Skills) into place, one after the other, right as the visitor
// arrives at the skills/satellites stop.
//
// Same split as src/motion/statsCounter.js, testimonialsReveal.js,
// and educationReveal.js: anime.js does the actual fade/rise
// animation; GSAP's ScrollTrigger is only used to know WHEN to start
// it. ScrollTrigger and its smooth-scroll setup (Lenis) were already
// switched on in src/motion/lenis.js - this file just reuses that
// same plugin registration, it does NOT create a second Lenis
// instance or register the plugin again.
// ===================================================================

import { animate } from 'animejs'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion.js'

export function initSkillsReveal() {
  const cards = document.querySelectorAll('#pin-satellites .skills-card')
  if (cards.length === 0) return

  // ---- Reduced motion: skip the fade/rise, show the cards immediately ----
  // A fade combined with a rising motion is exactly the kind of thing
  // this setting asks to avoid, so it's skipped entirely - both
  // cards just appear in their finished, fully-visible position right
  // away instead of animating into it.
  if (prefersReducedMotion) {
    cards.forEach((card) => {
      card.style.opacity = 1
      card.style.transform = 'none'
    })
    return
  }

  // Otherwise, the cards stay in their hidden starting state (see the
  // "opacity: 0" / "transform: translateY(24px)" rule on
  // ".skills-card" in src/styles/content.css) until this ScrollTrigger
  // below actually fires - so a visitor who lands further down the
  // page and scrolls back UP never sees them already sitting there
  // before actually reaching this stop.

  // Fires the reveal exactly once, right as the satellites stop's own
  // camera pin engages - "top top" here is the same trigger point
  // src/motion/scrollTimeline.js uses to freeze the camera on this
  // stop, so the cards animate in at the same moment this stop
  // actually becomes the one being viewed. once: true tells
  // ScrollTrigger to run this a single time and then fully forget
  // about it - scrolling away and back later does NOT replay the
  // reveal a second time.
  ScrollTrigger.create({
    trigger: '#pin-satellites',
    start: 'top top',
    once: true,
    onEnter: () => {
      animate(cards, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 700,
        delay: (_el, i) => i * 100, // Soft Skills lifts in slightly after Technical Skills, instead of both snapping in at once
        ease: 'outCubic',
      })
    },
  })
}
