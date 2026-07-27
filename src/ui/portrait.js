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

  // ---- Only show the portrait once the visitor reaches Earth/Contact -----
  // The portrait is position: fixed (so the cursor-parallax above can
  // keep moving it), which means it starts out hidden by default (see
  // the opacity/visibility/pointer-events rules in portrait.css) -
  // otherwise it would float on top of every stop, including the very
  // first one at the top of the page. This ScrollTrigger reveals it
  // only once Earth's stop (#pin-earth, the last of the 10 camera
  // stops - see index.html and src/motion/scrollTimeline.js) actually
  // scrolls into view. This used to watch a separate #contact
  // <section> instead - that section has been removed (its content,
  // including this portrait, now lives directly inside #pin-earth), so
  // watching for #contact specifically would never fire again.
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

  // start: 'top top' -> the trigger point is the exact same moment
  // Earth's own camera pin engages (see src/motion/scrollTimeline.js) -
  // both watch for the top of #pin-earth reaching the top of the
  // screen. Deliberately NOT "top 60%" (an earlier attempt): #pin-earth
  // itself is now a practically-zero-height element (its real content
  // lives in a separately-sized child, .pin-content - see
  // src/styles/base.css for why), so measuring "60% of the way down
  // the screen" against the marker's OWN tiny height put the reveal
  // window entirely BEFORE the pin engages, meaning the portrait would
  // reveal briefly during the approach and then hide again right as
  // the camera actually parked on Earth - confirmed directly, exactly
  // backwards from what's wanted. Locking onto "top top" instead ties
  // the reveal to the exact same moment as the pin, regardless of the
  // marker's own size.
  //
  // There's also no onLeave here (only onLeaveBack, for scrolling back
  // UP away from Earth) - Earth is the final stop with nothing after
  // it, so once a visitor arrives there's never a "next" moment to
  // hide the portrait for going forward; it stays up for the rest of
  // the page, the same way the camera itself stays locked on Earth
  // rather than easing away from it.
  ScrollTrigger.create({
    trigger: '#pin-earth',
    start: 'top top',
    onEnter: revealPortrait,
    onEnterBack: revealPortrait,
    onLeaveBack: hidePortrait,
  })
}
