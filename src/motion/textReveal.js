// ===================================================================
// TEXTREVEAL.JS
// This file makes each section's heading "assemble" itself letter by
// letter as you scroll down to it, instead of just appearing all at
// once. Two different tools split this job between them:
//
//   - GSAP's ScrollTrigger only WATCHES the scroll position and says
//     "now" when a heading scrolls into view. It does not do any of
//     the actual animating here.
//   - anime.js is what actually animates each letter fading in and
//     rising into place, once ScrollTrigger says "now."
//
// ScrollTrigger was already switched on in src/motion/lenis.js - this
// file reuses that same setup. It does NOT create a new Lenis
// instance or register the plugin again.
// ===================================================================

import ScrollTrigger from 'gsap/ScrollTrigger'
import { animate, stagger } from 'animejs'
import { prefersReducedMotion } from './reducedMotion.js'

// Takes one heading element, breaks its text into one <span> per
// character (keeping spaces as their own characters so words don't
// get squashed together), and returns the list of those new <span>
// elements so they can be animated afterward.
function splitIntoCharacterSpans(heading) {
  const originalText = heading.textContent

  // Empty out the heading now that we've saved its text - we're about
  // to rebuild it out of individual character spans.
  heading.textContent = ''

  const characterSpans = []

  for (const character of originalText) {
    const span = document.createElement('span')

    // Setting the character directly (including if it's a space) is
    // what keeps multi-word headings like "Case Studies" from turning
    // into "CaseStudies" - each space gets preserved as its own span.
    span.textContent = character

    // inline-block is needed so the translateY (vertical slide)
    // animation below actually works - plain inline elements don't
    // reliably support being moved like this.
    span.style.display = 'inline-block'

    // Start each letter invisible and shifted down slightly. anime.js
    // will animate FROM this starting point up to fully visible further
    // down in this file, once its section scrolls into view.
    span.style.opacity = '0'
    span.style.transform = 'translateY(20px)'

    heading.appendChild(span)
    characterSpans.push(span)
  }

  return characterSpans
}

// Call this once, when the page starts up, to set up every section
// heading's letter-by-letter reveal.
export function initTextReveals() {
  // Grab the one <h2> heading inside every <section>.
  const headings = document.querySelectorAll('section h2')

  headings.forEach((heading) => {
    // ---- Reduced motion: one quick, simple fade instead ---------------------
    // Visitors who've turned on "reduce motion" don't get the long
    // cascading letter-by-letter animation at all - the heading is
    // never split into per-character spans, and instead just fades in
    // as one whole piece, quickly. WHEN it fades in still follows the
    // same rules as normal (Hero waits for Enter, others wait for
    // scroll), only the animation itself is replaced with something
    // much shorter and simpler.
    if (prefersReducedMotion) {
      heading.style.opacity = '0'

      const revealWholeHeading = () => {
        animate(heading, {
          opacity: 1,
          duration: 200,
          easing: 'easeOutExpo',
        })
      }

      if (heading.closest('section').id === 'hero') {
        window.addEventListener('experience:start', revealWholeHeading, { once: true })
      } else {
        ScrollTrigger.create({
          trigger: heading,
          start: 'top 80%',
          once: true,
          onEnter: revealWholeHeading,
        })
      }

      return // This heading is fully handled - skip the normal version below.
    }

    // ---- Normal (motion allowed): the full character-by-character reveal ----
    const characterSpans = splitIntoCharacterSpans(heading)

    // ---- Hero is a special case ---------------------------------------------
    // Hero is visible the instant the page loads (scrollY = 0), so a
    // normal ScrollTrigger fires it immediately - while it's still
    // hidden behind the loading screen (src/ui/loader.js). That meant
    // it had already finished assembling before the visitor ever saw
    // it happen. Instead, Hero now waits for the visitor's own "Enter"
    // click, which fires a page-wide 'experience:start' event (see
    // loader.js). { once: true } here means this listener can only
    // ever run one time - the same one-time guarantee ScrollTrigger's
    // own once: true gives every other heading below.
    if (heading.closest('section').id === 'hero') {
      window.addEventListener(
        'experience:start',
        () => {
          // This is the exact same animation as every other heading
          // below - only WHEN it runs is different for Hero.
          animate(characterSpans, {
            opacity: 1,
            translateY: 0,
            delay: stagger(30),
            duration: 600,
            easing: 'easeOutExpo',
          })
        },
        { once: true },
      )
      return // Hero is fully handled above - skip its ScrollTrigger below.
    }

    // ScrollTrigger's only job here is to watch this heading's
    // position and fire once when it scrolls far enough into view.
    //   start: 'top 80%' -> fires once the TOP of the heading reaches
    //                       80% of the way down the screen (so it
    //                       triggers a little before it's fully
    //                       centered, not right at the very edge)
    //   once: true       -> after firing one time, this trigger turns
    //                       itself off - scrolling past it again
    //                       later won't replay the animation
    ScrollTrigger.create({
      trigger: heading,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        // This is the actual animation, and it's done entirely by
        // anime.js, not GSAP. ScrollTrigger's job above was only to
        // decide WHEN to call this.
        animate(characterSpans, {
          opacity: 1,
          translateY: 0,
          // stagger(30) makes each letter start 30 milliseconds after
          // the previous one, so they animate in one after another in
          // a quick ripple rather than all at once.
          delay: stagger(30),
          duration: 600,
          easing: 'easeOutExpo',
        })
      },
    })
  })
}
