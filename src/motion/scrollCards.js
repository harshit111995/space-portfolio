// ===================================================================
// SCROLLCARDS.JS
// This file makes a stack of cards cross-fade from one to the next
// as the visitor scrolls THROUGH a stop's pinned hold - not just once
// on arrival, but continuously tied to exactly how far through the
// hold they've scrolled. Scroll down and the next card fades in;
// scroll back up and it reverses.
//
// This is written generically (it takes WHICH stop and HOW MANY
// cards as plain arguments) so the same pattern can be reused for
// other stops later - Experience, Case Studies, and Volunteering are
// all expected to want this same "scroll through a park to flip
// through cards" behavior eventually. Saturn/Entrepreneur is just the
// first one actually wired up.
// ===================================================================

import ScrollTrigger from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion.js'

// How much of EACH CARD'S OWN STRETCH is spent smoothly cross-fading
// into/out of its neighbors, as a fraction of that card's own stretch
// - NOT a fraction of the whole hold. This distinction matters a lot
// once more than a handful of cards are involved: with only 3 cards,
// each one's own stretch is a big chunk of the whole hold (a third of
// it), so a small fixed slice of the WHOLE hold spent fading barely
// eats into that. But with 9 or 12 cards, each one's own stretch
// shrinks a lot (an eighth, a twelfth...) while a fixed slice of the
// WHOLE hold stays exactly the same size - eventually the fade zones
// on either side of a card become BIGGER than the card's own stretch,
// and it can never fade all the way up to fully visible at all.
// Tested directly on the 9-card Experience stop: the middle card
// topped out at 96% opacity with both neighbors still faintly showing
// through at all times, instead of ever being the one clean, fully-
// visible card. Sizing the fade as a fraction of EACH card's own
// stretch instead means that problem can't happen no matter how many
// cards there are - a fixed proportion of "fade" and "settled, fully
// visible" time always fits inside every card's own stretch.
const HALF_OVERLAP_FRACTION_OF_SEGMENT = 0.18

// Works out how visible ONE card should be, purely from the current
// scroll progress through the hold (0 at the very start, 1 at the
// very end). Every card gets a plain, equal-sized "home" stretch of
// that 0-1 range (with 3 cards, card 0 owns roughly the first third,
// card 1 the middle third, and so on) - it's fully visible (opacity 1)
// for most of its own stretch, then fades out right as the next
// card's stretch begins fading in, overlapping by a portion of that
// stretch (see HALF_OVERLAP_FRACTION_OF_SEGMENT above) on each side of
// that shared boundary. The very first card never needs to fade IN
// (it's already the one showing at the very start), and the very last
// card never needs to fade OUT (nothing follows it).
function getCardOpacity(cardIndex, progress, cardCount) {
  const segmentWidth = 1 / cardCount
  const segmentStart = cardIndex * segmentWidth
  const segmentEnd = segmentStart + segmentWidth
  const halfOverlap = segmentWidth * HALF_OVERLAP_FRACTION_OF_SEGMENT

  let opacity = 1

  const isFirstCard = cardIndex === 0
  const isLastCard = cardIndex === cardCount - 1

  if (!isFirstCard) {
    const fadeInStart = segmentStart - halfOverlap
    const fadeInEnd = segmentStart + halfOverlap
    if (progress < fadeInStart) {
      opacity = 0
    } else if (progress < fadeInEnd) {
      opacity = (progress - fadeInStart) / (fadeInEnd - fadeInStart)
    }
  }

  if (!isLastCard) {
    const fadeOutStart = segmentEnd - halfOverlap
    const fadeOutEnd = segmentEnd + halfOverlap
    if (progress > fadeOutEnd) {
      opacity = 0
    } else if (progress > fadeOutStart) {
      const fadingOutAmount = 1 - (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart)
      opacity = Math.min(opacity, fadingOutAmount)
    }
  }

  return Math.max(0, Math.min(1, opacity))
}

// pinId: the id of the stop's pin-marker element (e.g. "pin-saturn"),
// WITHOUT the leading "#". cardCount: how many ".scroll-card"
// elements are inside it.
export function initScrollCards(pinId, cardCount) {
  const container = document.querySelector(`#${pinId} .scroll-cards`)
  if (!container) return

  const cards = container.querySelectorAll('.scroll-card')
  const dotsContainer = document.querySelector(`#${pinId} .scroll-cards-dots`)
  const dots = document.querySelectorAll(`#${pinId} .scroll-cards-dots .dot`)

  // ---- Reduced motion: show every card at once, no scroll-driven fade ----
  // A cross-fade timed to scroll position is exactly the kind of
  // motion this setting asks to avoid. Instead, ".scroll-cards--stacked"
  // (see src/styles/content.css) turns the cards back into plain,
  // ordinary stacked content - nothing here needs to track scroll
  // progress at all, so this returns early without setting up
  // anything scroll-related below. The dots are hidden too - "which
  // one of 3 cards is active" isn't a meaningful question anymore
  // once all 3 are simply shown together.
  if (prefersReducedMotion) {
    container.classList.add('scroll-cards--stacked')
    if (dotsContainer) dotsContainer.style.display = 'none'
    return
  }

  // ---- Finding the SAME scroll range the camera's own pin already uses ---
  // This stop's camera hold (see src/motion/scrollTimeline.js) already
  // defines exactly which stretch of the page's scroll belongs to
  // this stop - there's no need to duplicate that range by hand here
  // (or risk it drifting out of sync with the real pin). Instead,
  // this reads the REAL, already-computed pixel boundaries straight
  // off that existing pin, the same way src/ui/certificatePanels.js
  // and src/ui/portrait.js already do for their own stops.
  const pinTrigger = ScrollTrigger.getAll().find(
    (scrollTrigger) => scrollTrigger.trigger && scrollTrigger.trigger.id === pinId && scrollTrigger.pin,
  )
  if (!pinTrigger) return // this stop's pin doesn't exist (yet) - nothing to attach to

  // Sets every card's starting look, before any scrolling into this
  // stop happens - card 0 fully shown, every other card fully hidden,
  // matching progress 0.
  function applyProgress(progress) {
    cards.forEach((card, i) => {
      const opacity = getCardOpacity(i, progress, cardCount)
      card.style.opacity = opacity
      // A card that's essentially invisible shouldn't still be
      // clickable/selectable underneath whichever one is actually
      // showing - this keeps mouse interaction pointed at whatever
      // the visitor can actually see.
      card.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none'
    })

    const activeIndex = Math.min(cardCount - 1, Math.floor(progress * cardCount))
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeIndex))
  }

  applyProgress(0)

  // A second, independent ScrollTrigger watching the exact same
  // start/end pixel range as the camera's own pin - GSAP is fine with
  // more than one ScrollTrigger sharing a range like this (portrait.js
  // and certificatePanels.js both already do the same thing for their
  // own stops). scrub: true just means "keep this tied directly to
  // the live scroll position," not any particular animation - the
  // actual cross-fade math happens by hand in applyProgress() above,
  // called fresh every time onUpdate fires.
  ScrollTrigger.create({
    start: pinTrigger.start,
    end: pinTrigger.end,
    scrub: true,
    onUpdate: (self) => applyProgress(self.progress),
  })
}
