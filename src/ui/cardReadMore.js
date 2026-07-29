// ===================================================================
// CARDREADMORE.JS
// Adds a "Read more"/"Read less" toggle to any uniform card (see
// src/styles/card.css) whose body text is too long to fit in its
// default, clamped-to-4-lines height. Cards whose text already fits
// get their button hidden - there'd be nothing extra to reveal.
//
// Important: this only ever touches text/CSS classes on the card
// itself. It never touches scroll position or anything in
// src/motion/scrollCards.js - clicking "Read more" must never advance
// the scroll-card crossfade or move the page.
// ===================================================================

export function initCardReadMore(pinId) {
  // Grab every card's body text within this one stop (e.g. pin-venus).
  const bodies = document.querySelectorAll(`#${pinId} .card-body`)

  bodies.forEach((body) => {
    // Each body sits inside a ".card-body-wrapper" alongside its own
    // "Read more" button - find that button now so we can show/hide
    // and wire it up below.
    const wrapper = body.closest('.card-body-wrapper')
    const button = wrapper.querySelector('.card-read-more')

    // Clamp every card's text to 4 lines first. We measure AFTER
    // clamping, on purpose: comparing the text's full natural height
    // (scrollHeight) against its now-clamped visible height
    // (clientHeight) is exactly what tells us whether any text is
    // actually being cut off.
    body.classList.add('card-body--clamped')

    // "+ 1" is just a small safety margin against sub-pixel rounding,
    // so text that clamps to *almost* exactly its own natural height
    // doesn't falsely count as "overflowing".
    const isOverflowing = body.scrollHeight > body.clientHeight + 1

    if (!isOverflowing) {
      // Short text: nothing to expand, so hide the button entirely
      // (the "hidden" attribute removes it from layout, not just view).
      button.hidden = true
      return
    }

    // Long text: wire up the toggle. Clicking only ever flips CSS
    // classes and swaps the button's own label - nothing here reads
    // or changes scroll position, so it can't interfere with the
    // scroll-card crossfade mechanic in src/motion/scrollCards.js.
    button.addEventListener('click', () => {
      const isExpanded = body.classList.toggle('card-body--expanded')
      body.classList.toggle('card-body--clamped', !isExpanded)
      button.textContent = isExpanded ? 'Read less' : 'Read more'
    })
  })
}
