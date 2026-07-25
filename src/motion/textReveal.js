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
    const characterSpans = splitIntoCharacterSpans(heading)

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
