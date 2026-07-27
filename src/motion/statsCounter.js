// ===================================================================
// STATSCOUNTER.JS
// This file makes the 5 big stat numbers on the About/Moon stop count
// UP from 0 to their real value, once, right as the visitor arrives
// at the Moon.
//
// Two different tools split the work here, on purpose (matching how
// this project keeps text/number motion and scroll-triggering
// separate elsewhere too): anime.js does the actual counting-up
// animation; GSAP's ScrollTrigger is only used to know WHEN to start
// it - it doesn't touch the numbers itself. ScrollTrigger and its
// smooth-scroll setup (Lenis) were already switched on in
// src/motion/lenis.js - this file just reuses that same plugin
// registration, it does NOT create a second Lenis instance or
// register the plugin again.
// ===================================================================

import { animate } from 'animejs'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion.js'

export function initStatsCounter() {
  // Each of the 5 numbers lives in a <span class="stat-number"> inside
  // #pin-moon (see index.html), carrying its own real target value
  // (and whatever short bit of text sits right before/after it, like
  // the "$" before 250 or the "K" after it) as plain HTML attributes -
  // data-prefix, data-target, data-suffix. Reading those means this
  // file doesn't need to know or care what any individual stat
  // actually means, just how to count a number up and glue the same
  // prefix/suffix back around it afterward.
  const numbers = document.querySelectorAll('#pin-moon .stat-number')
  if (numbers.length === 0) return

  // Rebuilds one number's text from its stored prefix/value/suffix -
  // used both for "jump straight to the finished number" (reduced
  // motion) and for every in-between frame while it's counting up.
  function renderValue(el, value) {
    const prefix = el.dataset.prefix || ''
    const suffix = el.dataset.suffix || ''
    el.textContent = `${prefix}${value}${suffix}`
  }

  // ---- Reduced motion: skip the count-up, show the final numbers -------
  // Counting up is exactly the kind of motion a visitor is asking to
  // avoid by turning this setting on, so it's skipped entirely - the
  // finished numbers appear immediately instead, with nothing left to
  // animate later.
  if (prefersReducedMotion) {
    numbers.forEach((el) => renderValue(el, el.dataset.target))
    return
  }

  // Every number starts at 0 (not its real value) the moment the page
  // loads, and stays that way until the count-up actually runs. This
  // matters for a visitor who scrolls straight past the Moon stop (or
  // jumps further down the page first) - without this, they'd see the
  // finished numbers before ever actually reaching the Moon.
  numbers.forEach((el) => renderValue(el, 0))

  // Animates ONE number from 0 up to its real target. counter is a
  // tiny, plain object - not connected to the page by itself - that
  // exists purely so anime.js has a single number to smoothly change
  // over time; onUpdate below runs on every frame of that animation
  // and is what actually copies the current in-between number onto
  // the screen (with its prefix/suffix re-attached each time).
  function countUp(el) {
    const target = Number(el.dataset.target)
    const counter = { value: 0 }
    animate(counter, {
      value: target,
      duration: 1500,
      ease: 'outExpo',
      onUpdate: () => renderValue(el, Math.round(counter.value)),
    })
  }

  // Fires the count-up exactly once, right as the Moon's own camera
  // pin engages - "top top" here is the same trigger point
  // src/motion/scrollTimeline.js uses to freeze the camera on the
  // Moon, so the numbers start counting at the same moment the Moon
  // stop actually becomes the one being viewed. once: true tells
  // ScrollTrigger to run this a single time and then fully forget
  // about it - scrolling away from the Moon and back again later does
  // NOT re-trigger the count-up a second time.
  ScrollTrigger.create({
    trigger: '#pin-moon',
    start: 'top top',
    once: true,
    onEnter: () => numbers.forEach(countUp),
  })
}
