// ===================================================================
// LOADER.JS
// This file builds the full-screen loading overlay you see first,
// before the site is ready: a little shuttle with an exhaust plume
// that grows as real files (textures, images) finish downloading, a
// percentage counter, and an "Enter" button that only works once
// everything has actually finished loading.
//
// GSAP/anime.js division of labor, kept consistent with earlier
// phases: this file uses anime.js for the loader's own fade-out
// animation. It has nothing to do with the 3D scene or scroll, so
// GSAP/ScrollTrigger aren't involved here at all.
// ===================================================================

import { animate } from 'animejs'

// manager is the SAME THREE.LoadingManager already being used by the
// moon, nebula, and planets to load their images - we just attach a
// couple of callbacks to it here so we hear about their progress too.
export function initLoader(manager) {
  // ---- Taking over the existing loading cover -----------------------------
  // "#loading-cover" already exists on the page - it's written
  // directly in index.html (with its own critical, inline <style> in
  // <head>) specifically so it's already there, solid and covering
  // the whole screen, before this script has even started running -
  // see the big comment above it in index.html for why that matters.
  // Rather than creating a second, separate overlay from scratch, this
  // file just takes that SAME element over: everything below (the
  // shuttle, the progress plume, the Enter button) gets built and
  // dropped straight into it.
  const overlay = document.getElementById('loading-cover')

  // position: fixed + covering the full screen + a very high z-index
  // means this sits on top of absolutely everything else (the 3D
  // canvas, the page content, the panels) until we hide it. (The
  // inline <style> in index.html already set these same three
  // properties once, earlier - setting them again here doesn't change
  // anything, it just keeps this file fully self-explanatory on its
  // own, without needing to also go read index.html to know what this
  // overlay looks like.)
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0', // shorthand for top/right/bottom/left: 0
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    background: '#050505',
    color: '#f3f4f6',
    fontFamily: 'system-ui, sans-serif',
  })

  // ---- The shuttle -----------------------------------------------------
  // Same basic rocket shape as before (nose, body, window, two fins,
  // an engine base), but rebuilt with metallic-looking gradients
  // instead of flat single colors, plus a soft glowing engine and a
  // faint outer glow, so it reads as a lit-up craft in the dark
  // rather than flat 2D clip-art. Still just plain SVG shapes - no
  // external image file needed.
  const shuttleWrapper = document.createElement('div')
  shuttleWrapper.innerHTML = `
    <svg width="90" height="130" viewBox="0 0 90 130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- The hull's metallic look: a light highlight fading down to
             a darker steel tone, like light catching a curved metal
             surface, instead of one flat fill color. -->
        <linearGradient id="hullGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="45%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>

        <!-- The nose cone gets its own similar gradient, angled
             slightly differently so it doesn't look like a flat
             continuation of the body panel below it. -->
        <linearGradient id="noseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>

        <!-- The porthole window: brighter in the middle, like it's
             glowing from a light inside the craft. -->
        <radialGradient id="windowGradient" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#e0f2fe" />
          <stop offset="50%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0369a1" />
        </radialGradient>

        <!-- The engine's glow: bright white-blue in the center,
             fading out to fully see-through at the edge. -->
        <radialGradient id="thrusterGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#7dd3fc" />
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0" />
        </radialGradient>

        <!-- feGaussianBlur softens a sharp-edged shape into a hazy
             glow - this is what turns the engine gradient above into
             something that reads as GLOWING light, not a painted disc. -->
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        <!-- A wider, gentler blur used for the faint glow around the
             whole craft. -->
        <filter id="outerGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <!-- A faint, blurred glow behind the whole craft, as if it's
           lit up against the dark background rather than pasted flat
           on top of it. -->
      <g filter="url(#outerGlow)" opacity="0.35">
        <rect x="22" y="44" width="46" height="52" rx="8" fill="#7dd3fc" />
      </g>

      <!-- The engine's glow, blurred into a soft halo underneath the
           craft (separate from the exhaust-progress-bar element
           further down the page, which is unchanged). -->
      <ellipse cx="45" cy="100" rx="14" ry="10" fill="url(#thrusterGradient)" filter="url(#softGlow)" />

      <!-- Nose cone -->
      <path d="M45 4 L67 46 L23 46 Z" fill="url(#noseGradient)" />

      <!-- Main hull -->
      <rect x="22" y="46" width="46" height="52" rx="8" fill="url(#hullGradient)" />

      <!-- Faint panel-seam lines across the hull, so it reads as
           several metal panels bolted together rather than one flat
           shape. -->
      <g stroke="#475569" stroke-width="1" opacity="0.4">
        <line x1="22" y1="60" x2="68" y2="60" />
        <line x1="22" y1="76" x2="68" y2="76" />
        <line x1="36" y1="46" x2="36" y2="98" />
        <line x1="54" y1="46" x2="54" y2="98" />
      </g>

      <!-- Porthole window -->
      <circle cx="45" cy="64" r="9" fill="url(#windowGradient)" stroke="#0c4a6e" stroke-width="1" />

      <!-- Solar-panel-like fins, with a few thin lines suggesting
           individual panel cells rather than a plain flat triangle. -->
      <path d="M22 76 L4 106 L22 100 Z" fill="url(#hullGradient)" />
      <path d="M68 76 L86 106 L68 100 Z" fill="url(#hullGradient)" />
      <g stroke="#334155" stroke-width="0.75" opacity="0.5">
        <line x1="14" y1="86" x2="20" y2="84" />
        <line x1="10" y1="94" x2="20" y2="91" />
        <line x1="76" y1="86" x2="70" y2="84" />
        <line x1="80" y1="94" x2="70" y2="91" />
      </g>

      <!-- Engine base -->
      <rect x="30" y="98" width="30" height="9" rx="2" fill="#334155" />
    </svg>
  `

  // ---- Idle float + drift, while loading -----------------------------------
  // A gentle, continuous animation so the craft feels alive rather
  // than a static picture: it slowly rises and sinks (translateY)
  // while very slightly rocking side to side (rotate).
  //   direction: 'alternate' -> after reaching the end values, it
  //                             plays back in reverse to return to
  //                             the start, instead of snapping back
  //   loop: true              -> repeats this forever
  //   duration: 1500          -> each leg (there, or back) takes 1.5s,
  //                             so one full up-and-down cycle is ~3s
  animate(shuttleWrapper, {
    translateY: [-8, 8],
    rotate: [-2, 2],
    duration: 1500,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine',
  })

  // ---- The exhaust plume -------------------------------------------------
  // An empty rectangle directly under the shuttle. Its HEIGHT is what
  // we grow as loading progresses, so it looks like the engine is
  // building up. It starts at 0 height (fully loaded state, at the
  // end, is the max height below).
  const plumeMaxHeight = 90 // pixels
  const plume = document.createElement('div')
  Object.assign(plume.style, {
    width: '18px',
    height: '0px',
    marginTop: '-4px', // tucks it slightly up under the shuttle's base
    // Re-tinted to a cool blue-white, matching the redesigned engine
    // glow above, instead of the old orange/yellow flame colors.
    background: 'linear-gradient(to bottom, #e0f2fe, #38bdf8, transparent)',
    borderRadius: '0 0 8px 8px',
    // A short transition makes each height update glide smoothly
    // instead of jumping in hard steps between progress updates.
    transition: 'height 0.2s ease-out',
  })

  // ---- The percentage counter ---------------------------------------------
  const percentText = document.createElement('div')
  percentText.textContent = '0%'
  Object.assign(percentText.style, {
    fontSize: '1.1rem',
    letterSpacing: '0.05em',
    opacity: '0.85',
  })

  // ---- The Enter button ----------------------------------------------------
  // Starts disabled - it only becomes clickable once the manager
  // reports everything has finished loading, further down.
  const enterButton = document.createElement('button')
  enterButton.textContent = 'Enter'
  enterButton.disabled = true
  Object.assign(enterButton.style, {
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'not-allowed',
    opacity: '0.35',
    transition: 'opacity 0.3s ease',
  })

  // Put all the pieces together inside the overlay - no need to add it
  // to the page ourselves, it's already there (see the top of this
  // function).
  overlay.append(shuttleWrapper, plume, percentText, enterButton)

  // ---- Tracking real loading progress --------------------------------------
  // onProgress is called by the LoadingManager every time ONE more
  // file (a texture image, for example) finishes downloading. It
  // tells us how many are done out of how many total, which is a
  // genuine, real progress percentage - not a fake timer counting up
  // on its own.
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const percent = Math.round((itemsLoaded / itemsTotal) * 100)
    percentText.textContent = `${percent}%`
    plume.style.height = `${(percent / 100) * plumeMaxHeight}px`
  }

  // onLoad is called once, only after every single tracked file has
  // finished loading. Only then do we unlock the Enter button.
  manager.onLoad = () => {
    enterButton.disabled = false
    enterButton.style.cursor = 'pointer'
    enterButton.style.opacity = '1'
  }

  // ---- Leaving the loader screen --------------------------------------------
  enterButton.addEventListener('click', () => {
    // Prevent accidentally triggering this more than once (e.g. a
    // very fast double-click) while the fade-out is already playing.
    enterButton.disabled = true

    // #app (the real CV/portfolio content) starts hidden by default -
    // see the "#app" rule in src/styles/base.css - as a second,
    // backup layer of protection against ever flashing that content
    // too early, on top of this whole loading-cover overlay. Revealing
    // it right NOW, the instant "Enter" is clicked - rather than only
    // after the fade-out below finishes - matters: this overlay is
    // opaque and still fully covering the screen at this exact moment,
    // so the visitor can't actually see #app becoming visible yet
    // anyway. By the time the fade-out below finishes playing and this
    // overlay is gone, #app needs to ALREADY be sitting there fully
    // visible underneath it - otherwise the visitor would watch this
    // overlay fade away to reveal nothing at all for a moment.
    const app = document.getElementById('app')
    if (app) {
      app.style.opacity = '1'
      app.style.visibility = 'visible'
    }

    // Fade the whole overlay out smoothly using anime.js.
    animate(overlay, {
      opacity: [1, 0],
      duration: 900,
      easing: 'easeOutQuad',
      // onComplete only runs once the 900ms fade has actually
      // finished playing.
      onComplete: () => {
        // Fully remove the overlay from view and from ever blocking
        // clicks again, now that the fade is done.
        overlay.style.display = 'none'
        overlay.style.pointerEvents = 'none'

        // Tell the rest of the app "the visitor has now deliberately
        // started the experience." Later phases (like audio) can
        // listen for this to know it's safe/appropriate to begin,
        // since it only ever fires from this real button click - never
        // automatically on page load.
        window.dispatchEvent(new CustomEvent('experience:start'))
      },
    })
  })
}
