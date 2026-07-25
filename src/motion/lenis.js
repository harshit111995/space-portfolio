// ===================================================================
// LENIS.JS
// This file sets up "smooth scrolling" - instead of the page jumping
// straight to where you scroll, it eases toward it, which feels a lot
// smoother. It also connects that smooth scrolling to GSAP's
// ScrollTrigger (a tool used to trigger animations based on scroll
// position), so the two stay perfectly in sync.
// ===================================================================

import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

// Tell GSAP that the ScrollTrigger plugin exists and should be
// switched on. This only needs to happen once, here.
gsap.registerPlugin(ScrollTrigger)

// ---- Create the smooth scroller ----------------------------------------
//   lerp: 0.09    -> how quickly the scroll "catches up" to your
//                    mouse/trackpad input. Smaller = smoother/slower,
//                    larger = snappier/more immediate.
//   smoothWheel    -> turns on the easing effect for mouse wheel and
//                    trackpad scrolling.
const lenis = new Lenis({
  lerp: 0.09,
  smoothWheel: true,
})

// ---- Keeping Lenis and ScrollTrigger in sync ----------------------------
// Every time Lenis moves the page, tell ScrollTrigger to re-check
// scroll-based animations so they line up with the smoothed scroll
// position instead of the raw, unsmoothed one.
lenis.on('scroll', ScrollTrigger.update)

// IMPORTANT: Lenis needs to be "ticked" (updated) on every animation
// frame to actually animate the smoothing. Rather than starting a
// second, separate animation loop just for Lenis, we piggyback on
// GSAP's own ticker, which is already running one loop for all
// animations. This keeps everything - GSAP animations and smooth
// scrolling - perfectly in step with a single shared loop.
// GSAP's ticker gives time in seconds; Lenis expects milliseconds,
// hence the "* 1000".
gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

// GSAP normally tries to smooth over lag spikes (e.g. if the tab was
// in the background) by skipping/slowing time. That fights with Lenis
// doing its own smoothing, so we turn GSAP's lag smoothing off here.
gsap.ticker.lagSmoothing(0)

// Export the lenis instance so other files can use it later - for
// example, to scroll to a section programmatically, or to pause/stop
// smooth scrolling.
export default lenis
