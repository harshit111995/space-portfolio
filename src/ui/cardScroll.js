// ===================================================================
// CARDSCROLL.JS
// Adds a tiny ▲▼ button pair to any uniform card (see
// src/styles/card.css) whose FULL, expanded text is still too tall to
// fit inside the card's own fixed frame - clicking ▼ scrolls down to
// read more, ▲ scrolls back up. Cards that fit (whether collapsed or
// expanded) never get this control at all.
//
// ---- Why this exists instead of just letting the mouse wheel scroll it ---
// A long card's body used to be "overflow-y: auto" (see the big
// comment on ".card-body--expanded" in src/styles/card.css), which
// SOUNDS like the obvious way to read the rest of it - scroll the
// mouse wheel over the card. In practice that didn't work at all: this
// whole page's scrolling is what drives the camera and fades between
// cards (see src/motion/lenis.js and src/motion/scrollCards.js), and
// that page-level scroll swallows every wheel turn everywhere on the
// page, including over a card - so wheeling over a long, open card did
// nothing to its text and instead just silently advanced to the NEXT
// card underneath. Confusing, since it looks exactly like the visitor
// asked to read more of THIS one.
//
// The fix (see ".card-body--expanded" in card.css) makes that box
// impossible to scroll via wheel/touch/scrollbar-drag at all, and this
// file is what gives it a different, unambiguous way to be read
// instead: two small buttons that move the text by calling
// scrollBy()/scrollTo() on it directly, in code - completely
// independent of the wheel, so it can never fight with the page's own
// scroll again.
//
// Like src/ui/cardReadMore.js, this only ever touches one card's own
// text/scroll-position. It never reads or changes the page's own
// scroll position, and never touches src/motion/scrollCards.js - so it
// can't interfere with, or be interfered with by, the crossfade
// mechanic that flips between cards.
// ===================================================================

// How far one click of ▼/▲ moves the text, as a fraction of how much
// of the card's body is actually visible at once. Less than 1 (a full
// "screen" of text) on purpose - ending each click with the last
// couple of lines from before still visible at the top gives a little
// reading overlap, the same trick a lot of "page down" controls use,
// so nothing in between two clicks ever gets silently skipped over.
const SCROLL_CHUNK_FRACTION = 0.85

// A tiny rounding cushion used whenever comparing scroll positions
// below (e.g. "am I at the very top?") - real browsers can report
// scroll numbers a fraction of a pixel off from what plain arithmetic
// expects, and without this cushion that tiny gap could leave an
// arrow looking clickable (or stuck disabled) one pixel short of
// where it actually should flip.
const SCROLL_EDGE_TOLERANCE = 1

// Builds the ▲▼ control for one card and returns it, not yet attached
// to anything - the caller below decides where it goes and when it's
// shown. Kept as its own small function purely so initCardScroll()
// itself stays easy to read top to bottom.
function buildArrowControl() {
  const container = document.createElement('div')
  container.className = 'card-scroll-arrows'
  // Starts hidden on every card - initCardScroll() below only ever
  // reveals this for a card that actually needs it, the moment it
  // finds out (see the "Read more" click handler further down).
  container.hidden = true

  const upButton = document.createElement('button')
  upButton.type = 'button'
  upButton.className = 'card-scroll-arrow card-scroll-arrow--up'
  upButton.setAttribute('aria-label', 'Scroll card text up')
  upButton.textContent = '▲'

  const downButton = document.createElement('button')
  downButton.type = 'button'
  downButton.className = 'card-scroll-arrow card-scroll-arrow--down'
  downButton.setAttribute('aria-label', 'Scroll card text down')
  downButton.textContent = '▼'

  container.appendChild(upButton)
  container.appendChild(downButton)

  return { container, upButton, downButton }
}

// pinId: the id of the stop's pin-marker element (e.g. "pin-mars"),
// WITHOUT the leading "#" - same convention as
// src/motion/scrollCards.js and src/ui/cardReadMore.js.
export function initCardScroll(pinId) {
  // Every card in this stop that actually has real body text and a
  // "Read more" button - see src/ui/cardReadMore.js, which is
  // responsible for that button existing/working at all, and MUST run
  // before this file does (see the call order in src/main.js) so the
  // clamped/expanded classes it manages are already there to read.
  const cards = document.querySelectorAll(`#${pinId} .card`)

  cards.forEach((card) => {
    const body = card.querySelector('.card-body')
    const readMoreButton = card.querySelector('.card-read-more')
    if (!body || !readMoreButton) return

    const { container, upButton, downButton } = buildArrowControl()
    card.appendChild(container)

    // Reads the text's CURRENT scroll position and turns whichever
    // arrow no longer applies into a real, disabled button (not just
    // a greyed-out look - "disabled" also makes it genuinely
    // unclickable). Called every time the scroll position changes,
    // from whatever caused that change - a button click below, or the
    // element's own native "scroll" event, which fires continuously
    // while a smooth scroll set off by that click is still animating.
    function updateArrowState() {
      const atTop = body.scrollTop <= SCROLL_EDGE_TOLERANCE
      const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - SCROLL_EDGE_TOLERANCE
      upButton.disabled = atTop
      downButton.disabled = atBottom
    }

    // direction: -1 for the ▲ button, 1 for the ▼ button. Moves the
    // text by roughly one "chunk" of the card's own visible height
    // (see SCROLL_CHUNK_FRACTION above) - scrollBy with
    // behavior: "smooth" eases into the new position over a moment,
    // rather than snapping straight there, so it's easy to follow
    // where the text just went.
    function scrollByOneChunk(direction) {
      const chunk = body.clientHeight * SCROLL_CHUNK_FRACTION
      body.scrollBy({ top: direction * chunk, behavior: 'smooth' })
    }

    upButton.addEventListener('click', () => scrollByOneChunk(-1))
    downButton.addEventListener('click', () => scrollByOneChunk(1))
    body.addEventListener('scroll', updateArrowState)

    // ---- Showing/hiding the whole control -----------------------------------
    // Runs every time "Read more"/"Read less" is clicked.
    // src/ui/cardReadMore.js's OWN click handler on this exact same
    // button (registered first - see src/main.js for the required
    // call order) has already flipped the card between its clamped
    // and expanded classes by the time this one runs, since browsers
    // run multiple listeners on the same element in the order they
    // were attached - so it's safe to read the result immediately.
    readMoreButton.addEventListener('click', () => {
      const isExpanded = body.classList.contains('card-body--expanded')

      if (!isExpanded) {
        // Collapsed back to the short, clamped preview - the arrows
        // don't apply there at all (that state has its own "Read
        // more" + fade as its way of hinting more text follows).
        // Resetting the scroll position back to the top means the
        // NEXT time this same card is expanded, it starts from the
        // beginning again, matching what the clamped preview it's
        // replacing was already showing.
        container.hidden = true
        body.scrollTop = 0
        return
      }

      // Just expanded - whether the arrows are actually needed is a
      // SEPARATE question from whether the short, clamped preview
      // overflowed (that's what decided whether "Read more" showed up
      // at all). The expanded view has a lot more of the card's own
      // height to work with, so plenty of "Read more"-eligible cards
      // turn out to fit completely once opened, with nothing left to
      // scroll to - those get no arrows either.
      const stillOverflows = body.scrollHeight > body.clientHeight + SCROLL_EDGE_TOLERANCE
      container.hidden = !stillOverflows
      if (stillOverflows) updateArrowState()
    })
  })
}
