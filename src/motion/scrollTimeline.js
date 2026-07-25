// ===================================================================
// SCROLLTIMELINE.JS
// This file connects scrolling to the camera's position. As you
// scroll down the page, the camera moves backward through the 3D
// scene, which is what creates the "flying through space" feeling.
//
// It uses GSAP's ScrollTrigger to "scrub" the animation: instead of
// playing on its own, the animation's progress is tied directly to
// how far down the page you've scrolled. ScrollTrigger was already
// switched on and connected to the smooth-scroll setup in
// src/motion/lenis.js - this file just reuses that, it doesn't set
// any of that up again.
// ===================================================================

import gsap from 'gsap'

export function init(camera) {
  // ---- The scroll-driven timeline --------------------------------------
  //   trigger: "#app"   -> watch scroll progress across our whole page
  //                        content wrapper
  //   start: "top top"   -> the animation begins when the top of #app
  //                        hits the top of the screen (i.e. right away)
  //   end: "bottom bottom" -> the animation finishes when the bottom of
  //                        #app hits the bottom of the screen (i.e. the
  //                        very end of the page)
  //   scrub: 1           -> instead of jumping to match scroll position
  //                        instantly, it takes about 1 second to catch
  //                        up, which feels smoother than a hard 1-to-1 link
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#app',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
    },
  })

  // ---- The camera's journey through space --------------------------------
  // The timeline's total length is treated as 100 units, so that each
  // step's length can be written as a percentage of the whole page
  // scroll - this makes it easy to line camera moves up with specific
  // points in the scroll (e.g. "40" below means "40% of the way down
  // the page").
  //
  // Each .to() call moves the camera's z position from wherever it
  // currently is to a new value, over the given slice of the timeline.
  // Chained one after another like this, they play back-to-back, so
  // the camera moves smoothly and continuously the whole way down the
  // page rather than jumping between points.
  //
  //   duration  ends at (cumulative %)   what's "arriving" at that point
  //   ---------------------------------------------------------------
  //   -          0%   camera.position.z = 10   (starting point)
  //   22         22%  camera.position.z = -30   (moon recedes)
  //   18         40%  camera.position.z = -45   (Mars)
  //   16         56%  camera.position.z = -80   (Venus)
  //   16         72%  camera.position.z = -110  (constellations)
  //   16         88%  camera.position.z = -145  (stars)
  //   12        100%  camera.position.z = -175  (Earth)
  timeline
    // Lock in the exact starting value, so the journey always begins
    // at z = 10 no matter what the camera was doing before.
    .set(camera.position, { z: 10 })
    // ease: 'none' is used throughout so the camera's speed matches
    // scroll speed directly, without extra speeding-up/slowing-down
    // added on top of the scrub smoothing above.
    .to(camera.position, { z: -30, duration: 22, ease: 'none' })
    .to(camera.position, { z: -45, duration: 18, ease: 'none' })
    .to(camera.position, { z: -80, duration: 16, ease: 'none' })
    .to(camera.position, { z: -110, duration: 16, ease: 'none' })
    .to(camera.position, { z: -145, duration: 16, ease: 'none' })
    .to(camera.position, { z: -175, duration: 12, ease: 'none' })

  // Note: only the camera moves here. No meshes/objects in the scene
  // are touched by this file.
}
