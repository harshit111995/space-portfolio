// ===================================================================
// PORTRAIT.JS
// This file makes the circular portrait photo drift a tiny bit as you
// move the mouse - a subtle "parallax" (depth) effect, as if the
// photo sits slightly back in its own little pocket of the scene
// rather than being flat against the screen.
// ===================================================================

import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

export function initPortraitParallax() {
  const portrait = document.querySelector('.portrait')
  if (!portrait) return

  // gsap.quickTo builds a small, reusable function for smoothly
  // animating ONE property over and over again - perfect for an
  // effect like this that keeps re-aiming at a new target every time
  // the mouse moves. Calling xTo(5), for example, eases the
  // portrait's x position smoothly toward 5px instead of snapping
  // there instantly.
  const xTo = gsap.quickTo(portrait, 'x', { duration: 0.6, ease: 'power3' })
  const yTo = gsap.quickTo(portrait, 'y', { duration: 0.6, ease: 'power3' })

  window.addEventListener('mousemove', (event) => {
    // Turn the mouse position into a -1 to 1 range, where 0 means the
    // exact center of the screen.
    const normalizedX = (event.clientX / window.innerWidth) * 2 - 1
    const normalizedY = (event.clientY / window.innerHeight) * 2 - 1

    // Scale that down to a small +-10px range. This is deliberately
    // much less movement than the planets get elsewhere in the scene,
    // so the portrait reads as sitting close to the "camera" (barely
    // drifting) rather than floating loosely on top of everything.
    xTo(normalizedX * 10)
    yTo(normalizedY * 10)
  })

  // ---- Only show the portrait once the visitor reaches Contact -----------
  // The portrait is position: fixed (so the cursor-parallax above can
  // keep moving it), which means it starts out hidden by default (see
  // the opacity/visibility/pointer-events rules in portrait.css) -
  // otherwise it would float on top of every section, including the
  // Hero text at the very top of the page. This ScrollTrigger reveals
  // it only once the Contact section actually scrolls into view.
  //
  // ScrollTrigger was already switched on in src/motion/lenis.js -
  // this reuses that same setup. It does NOT create a new Lenis
  // instance or register the plugin again.
  //
  // autoAlpha is a GSAP shortcut that animates opacity AND toggles
  // visibility together, in the correct order: switching to "visible"
  // right away when fading IN (so the fade-in is actually seen), but
  // only switching to "hidden" once a fade OUT has fully finished (so
  // it fades away smoothly instead of vanishing instantly).
  function revealPortrait() {
    gsap.to(portrait, {
      autoAlpha: 1,
      pointerEvents: 'auto',
      duration: 0.6,
    })
  }

  function hidePortrait() {
    gsap.to(portrait, {
      autoAlpha: 0,
      pointerEvents: 'none',
      duration: 0.6,
    })
  }

  // start: 'top 60%' -> the trigger point is when the top of the
  // Contact section reaches 60% of the way down the screen.
  // Both "entering" callbacks (scrolling down into view, or scrolling
  // back down into view) reveal it; both "leaving" callbacks
  // (scrolling past it in either direction) hide it again - so it's
  // only ever visible while Contact is actually on screen, regardless
  // of which way the visitor is scrolling.
  ScrollTrigger.create({
    trigger: '#contact',
    start: 'top 60%',
    onEnter: revealPortrait,
    onEnterBack: revealPortrait,
    onLeave: hidePortrait,
    onLeaveBack: hidePortrait,
  })
}
