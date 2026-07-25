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
  // ---- Building the overlay, piece by piece ------------------------------
  // Everything below is created directly in JavaScript (rather than
  // written in index.html) so this whole feature lives in one file.

  const overlay = document.createElement('div')
  overlay.id = 'loader'
  // position: fixed + covering the full screen + a very high z-index
  // means this sits on top of absolutely everything else (the 3D
  // canvas, the page content, the panels) until we hide it.
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
  // A simple rocket built entirely out of basic SVG shapes (a
  // triangle nose, a rounded body, a window, two fins, and a base) -
  // no external image file needed.
  const shuttleWrapper = document.createElement('div')
  shuttleWrapper.innerHTML = `
    <svg width="80" height="120" viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 0 L60 42 L20 42 Z" fill="#e5e7eb" />
      <rect x="20" y="42" width="40" height="48" rx="6" fill="#f3f4f6" />
      <circle cx="40" cy="58" r="8" fill="#38bdf8" />
      <path d="M20 68 L4 96 L20 90 Z" fill="#9ca3af" />
      <path d="M60 68 L76 96 L60 90 Z" fill="#9ca3af" />
      <rect x="26" y="90" width="28" height="8" fill="#6b7280" />
    </svg>
  `

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
    background: 'linear-gradient(to bottom, #fbbf24, #f97316, transparent)',
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

  // Put all the pieces together and add the whole overlay to the page.
  overlay.append(shuttleWrapper, plume, percentText, enterButton)
  document.body.appendChild(overlay)

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
