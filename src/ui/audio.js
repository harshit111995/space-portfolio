// ===================================================================
// AUDIO.JS
// This file adds a quiet ambient background sound loop, plus a small
// button to turn it on or off. Two rules matter more than anything
// else here:
//
//   1. It defaults to OFF, and remembers whatever the visitor last
//      chose, across visits (using localStorage - the browser's own
//      small persistent storage).
//   2. It never even TRIES to play sound until the visitor has
//      clicked "Enter" (the experience:start event fired by
//      src/ui/loader.js). Browsers actively block audio that starts
//      on its own before a real click - trying earlier wouldn't just
//      be rude, it would silently fail (or log a warning) anyway.
// ===================================================================

const STORAGE_KEY = 'audio-enabled'

export function initAudio() {
  // ---- The audio itself --------------------------------------------------
  const audio = new Audio()
  audio.loop = true
  // Starts silent - whenever playback actually begins (further down),
  // we fade the volume up smoothly rather than starting at full volume.
  audio.volume = 0
  // Without this, the browser downloads the whole audio file right
  // away, on page load - even though sound is off by default and
  // most visitors may never turn it on. "none" tells the browser not
  // to fetch anything until playback is actually requested (the first
  // .play() call, further down, which only ever happens after the
  // visitor has both clicked Enter AND turned the toggle on).
  audio.preload = 'none'

  // Offering TWO <source> files lets the browser pick whichever
  // format it actually supports - .webm first (smaller file), with
  // .mp3 as a fallback for browsers that can't play webm audio.
  const webmSource = document.createElement('source')
  webmSource.src = '/audio/ambient.webm'
  webmSource.type = 'audio/webm'

  const mp3Source = document.createElement('source')
  mp3Source.src = '/audio/ambient.mp3'
  mp3Source.type = 'audio/mpeg'

  audio.append(webmSource, mp3Source)

  // ---- Remembering the visitor's choice -----------------------------------
  // localStorage keeps a small piece of text saved in the browser
  // even after the page is closed or refreshed. If nothing has been
  // saved yet (first-ever visit), this defaults to OFF - starting
  // silent is the considerate choice.
  let isEnabled = localStorage.getItem(STORAGE_KEY) === 'true'

  // ---- The on/off button ---------------------------------------------------
  const button = document.createElement('button')
  button.id = 'audio-toggle'
  button.setAttribute('aria-label', 'Toggle ambient sound')
  Object.assign(button.style, {
    position: 'fixed',
    top: '1.25rem',
    right: '1.25rem',
    // Above the 3D canvas (z-index 1) and the page content (z-index
    // 2), so the button is always reachable - but still well below
    // the loading screen (z-index 9999), which is what keeps it
    // hidden/unclickable until the visitor has entered.
    zIndex: '20',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  })

  // Two tiny speaker icons, built directly out of SVG shapes (no
  // image files needed) - we just swap which one is shown to reflect
  // whether sound is currently on or off.
  const speakerOnIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#f3f4f6" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="#f3f4f6" stroke-width="1.5" stroke-linecap="round" />
      <path d="M19 6a9 9 0 0 1 0 12" stroke="#f3f4f6" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  `
  const speakerOffIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#f3f4f6" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="#f3f4f6" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  `

  function updateIcon() {
    button.innerHTML = isEnabled ? speakerOnIcon : speakerOffIcon
  }
  updateIcon()

  document.body.appendChild(button)

  // ---- Fading the volume smoothly, by hand --------------------------------
  // Rather than jumping straight to a new volume (which would sound
  // like an abrupt click), this nudges it there gradually over the
  // given time. requestAnimationFrame runs this once per screen
  // repaint, which is what keeps the fade smooth.
  let fadeFrameId = null

  function fadeVolumeTo(targetVolume, durationMs, onDone) {
    // If a previous fade is still running, stop it first so two
    // fades can't fight over the volume at the same time.
    if (fadeFrameId !== null) cancelAnimationFrame(fadeFrameId)

    const startVolume = audio.volume
    const startTime = performance.now()

    function step(now) {
      // A timestamp handed to requestAnimationFrame can occasionally
      // read as very slightly BEFORE our own performance.now() call
      // above (a quirk of how frame timing works), which would make
      // "elapsed" negative for an instant. Clamping it to 0 stops
      // that from ever turning into a negative, invalid volume.
      const elapsed = Math.max(0, now - startTime)
      // progress goes from 0 (just started) to 1 (fully done).
      const progress = Math.min(elapsed / durationMs, 1)
      audio.volume = startVolume + (targetVolume - startVolume) * progress

      if (progress < 1) {
        fadeFrameId = requestAnimationFrame(step)
      } else {
        fadeFrameId = null
        if (onDone) onDone()
      }
    }

    fadeFrameId = requestAnimationFrame(step)
  }

  // ---- Turning sound on or off ---------------------------------------------
  function setEnabled(enabled) {
    isEnabled = enabled
    // Save the choice immediately, so it's remembered even if the
    // visitor refreshes or leaves right away.
    localStorage.setItem(STORAGE_KEY, String(enabled))
    updateIcon()

    if (enabled) {
      // Start playback first (if it isn't already going), then fade
      // the volume up - this avoids any sudden jump in loudness.
      if (audio.paused) {
        audio.play().catch(() => {
          // If the browser still won't allow it (for example, this
          // ran before any real click at all), there's nothing more
          // to do - it'll succeed next time playback is attempted
          // after a genuine interaction.
        })
      }
      fadeVolumeTo(0.5, 800)
    } else {
      // Fade down first, and only pause once it's actually silent -
      // pausing immediately would cut the sound off abruptly instead.
      fadeVolumeTo(0, 800, () => {
        audio.pause()
      })
    }
  }

  button.addEventListener('click', () => {
    setEnabled(!isEnabled)
  })

  // ---- Waiting for the visitor's deliberate "Enter" click -------------------
  // src/ui/loader.js only fires 'experience:start' from inside its
  // Enter button's own click handler - so hearing this event is proof
  // a real, deliberate click already happened. That's what makes it
  // safe (and allowed by the browser) to start playback here, if the
  // visitor had left sound turned on during an earlier visit.
  window.addEventListener(
    'experience:start',
    () => {
      if (isEnabled) {
        if (audio.paused) {
          audio.play().catch(() => {})
        }
        fadeVolumeTo(0.5, 800)
      }
    },
    { once: true },
  )
}
