// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout), starts
// up the 3D scene on the <canvas id="webgl">, turns on smooth
// scrolling for the page, builds the moon and the starry backdrop,
// and connects scrolling to the camera's movement through the scene.
import './styles/base.css'
import './styles/portrait.css'
import './styles/content.css'
import './styles/card.css'
import './styles/stopNav.css'
import * as THREE from 'three'
import scene from './scene/scene.js'
import { createMoon } from './scene/moon.js'
import { createStars, createNebula } from './scene/stars.js'
import { createPlanets } from './scene/planets.js'
import { createSaturn } from './scene/saturn.js'
import { createJupiter } from './scene/jupiter.js'
import { createMercury } from './scene/mercury.js'
import { createAsteroids } from './scene/asteroids.js'
import { createSatellites } from './scene/satellites.js'
import { createConstellations } from './scene/constellations.js'
import './motion/lenis.js'
import { init as initScrollTimeline } from './motion/scrollTimeline.js'
import { initTextReveals } from './motion/textReveal.js'
import { initDragLook } from './ui/cursor.js'
import { initLoader } from './ui/loader.js'
import { initAudio } from './ui/audio.js'
import { initPortraitParallax } from './ui/portrait.js'
import { initStatsCounter } from './motion/statsCounter.js'
import { initTestimonialsReveal } from './motion/testimonialsReveal.js'
import { initEducationReveal } from './motion/educationReveal.js'
import { initSkillsReveal } from './motion/skillsReveal.js'
import { initContactReveal } from './motion/contactReveal.js'
import { initScrollCards } from './motion/scrollCards.js'
import { initCardReadMore } from './ui/cardReadMore.js'
import { initCardScroll } from './ui/cardScroll.js'
import { initStopNav } from './ui/stopNav.js'

// Importing scene.js above runs its setup code right away: it builds
// the 3D scene, camera, lights, and starts the animation loop that
// draws it every frame. "scene" here is that scene's toolkit - it
// bundles the actual 3D scene, camera, renderer, and addUpdate().

// Importing lenis.js above turns on smooth scrolling and connects it
// to GSAP's shared animation loop.

// A LoadingManager keeps track of every image/texture being loaded,
// even across several different 3D objects. We create ONE here and
// hand it to anything that loads assets, so overall loading progress
// could be reported in one place later (e.g. a loading screen).
const manager = new THREE.LoadingManager()

// Show the loading screen and connect it to that LoadingManager right
// away, BEFORE anything below starts loading its images - this way it
// never misses any progress, and the scene stays hidden behind it
// until the visitor deliberately clicks "Enter."
initLoader(manager)

// Set up the ambient sound toggle. It stays silent until the visitor
// clicks "Enter" above (see src/ui/loader.js and src/ui/audio.js).
initAudio()

// Build the moon and add it into the 3D scene.
createMoon(scene, manager)

// Build the star field and the Milky Way backdrop that surrounds it.
createStars(scene)
createNebula(scene, manager)

// Build Mars, Venus, and Earth along the camera's path.
const { mars, venus, earth } = createPlanets(scene, manager)

// Build Saturn (the entrepreneur-journey planet) at the 4% stop - the
// first brand-new v2 body, not just a repositioned v1 one.
const saturn = createSaturn(scene, manager)

// Build Jupiter (the volunteering-stop planet) at the 84% stop.
const jupiter = createJupiter(scene, manager)

// Build Mercury (the testimonials-stop planet) - replaces the
// wireframe placeholder box that used to mark this stop before it had
// a real body.
createMercury(scene, manager)

// Build the 3 procedural asteroids at the education stop (74%). No
// LoadingManager needed here - unlike every other body so far, these
// are built from pure shape math, not a downloaded photo texture.
const asteroids = createAsteroids(scene)

// Build the 6 procedural satellites at the skills stop (78%). Also no
// LoadingManager needed - these are assembled entirely from
// primitives (boxes and a cone), not a downloaded texture.
const satellites = createSatellites(scene)

// Build the 8 certificate constellations at the certificates stop
// (69%) - purely decorative background now (see the big comment on
// #pin-constellations in index.html - the click-to-reveal interaction
// that used to live here has been removed entirely, the 8 issuers are
// shown as scroll-cards instead, further below). Also no
// LoadingManager needed - the star glow is a small canvas-drawn
// sprite, not a downloaded texture.
createConstellations(scene)

// v2: the old v1 single hover-panel-per-planet behavior (built in
// src/scene/raycaster.js) is retired - nothing has called
// registerTarget() on it in a long time, and it's no longer switched
// on here either. It's left in place, unused, rather than deleted, in
// case a similar planet-hover system is wanted again later.

// Hook up scrolling so it drives the camera's journey through space.
initScrollTimeline(scene.camera)

// Let the visitor click-and-drag to look around, like turning their
// head - this only changes which way the camera points, never where
// it is, so it can't interfere with the scroll journey above.
initDragLook(scene.camera)

// Set up the letter-by-letter heading reveals. This file (main.js) is
// loaded as a <script type="module">, and browsers only run module
// scripts after the whole page's HTML has been read and built - so
// the headings are guaranteed to already exist here, without needing
// to wait for any extra "DOM ready" event.
initTextReveals()

// Give the contact-section portrait its subtle mouse-follow drift.
initPortraitParallax()

// Make the 5 headline numbers on the About/Moon stop count up from 0
// once the visitor actually arrives there.
initStatsCounter()

// Fade and lift the two testimonial quote cards into place once the
// visitor actually arrives at the testimonials stop.
initTestimonialsReveal()

// Fade and lift the 3 education entries into place once the visitor
// actually arrives at the education/asteroids stop.
initEducationReveal()

// Fade and lift the 6 skill category cards into place once the
// visitor actually arrives at the skills/satellites stop.
initSkillsReveal()

// Fade and lift the contact details card into place once the visitor
// actually arrives at the Earth/contact stop.
initContactReveal()

// Cross-fade between the 3 entrepreneur cards as the visitor scrolls
// through Saturn's held pin. The same reusable function is called
// several more times below for Mars, Constellations, and Jupiter -
// same mechanic, completely unchanged, just a different stop id and
// card count each time. Case Studies (Venus) used to be called here
// too, but no longer is - its 11 cards now scroll naturally, all
// visible together, instead of cross-fading one at a time inside a
// fixed-size box (see the big comment on "#pin-venus" in index.html).
initScrollCards('pin-saturn', 3)

// Cross-fade between the 8 experience cards as the visitor scrolls
// through Mars's held pin (the old "Creative Marketing Manager"/Vile
// Parle card moved to Entrepreneur instead - see index.html - so this
// dropped from 9 to 8).
initScrollCards('pin-mars', 8)

// Cross-fade between the 8 certificate cards as the visitor scrolls
// through the constellations stop's held pin - replaces the old
// click-to-reveal panel interaction entirely.
initScrollCards('pin-constellations', 8)

// Cross-fade between the 3 volunteering cards as the visitor scrolls
// through Jupiter's held pin.
initScrollCards('pin-jupiter', 3)

// Turn on the "Read more"/"Read less" toggle for the four remaining
// scroll-card stops - Mars's 8 experience cards, Saturn's 3
// entrepreneur cards, Constellations's 8 certificate cards, and
// Jupiter's 3 volunteering cards - all still using the same uniform
// card design (see src/styles/card.css). This only ever changes
// text/CSS locally on a card; it has no effect on, and isn't affected
// by, the crossfade mechanic set up by initScrollCards above. Case
// Studies (Venus) is deliberately NOT called here anymore - its cards
// show their full text all the time now, with nothing to expand (see
// the big comment on "#pin-venus" in index.html).
initCardReadMore('pin-mars')
initCardReadMore('pin-saturn')
initCardReadMore('pin-constellations')
initCardReadMore('pin-jupiter')

// Add the ▲▼ "read the rest" arrows to whichever of the same four
// stops' cards actually need them (see src/ui/cardScroll.js) - a long
// card only ever gets these once BOTH "Read more" has been clicked AND
// its full text still doesn't fit. Each call here MUST come after that
// same stop's own initCardReadMore() call directly above, since this
// file reads the clamped/expanded state that call's own click handler
// sets up, the moment its own button is clicked. Skills, Testimonials,
// and now Case Studies too, don't get this at all - Skills/Testimonials
// cards (see src/styles/card.css) were never height-capped in the
// first place, and Case Studies cards no longer are either, so none of
// them can ever end up in the "expanded but still doesn't fit" state
// this exists for.
initCardScroll('pin-mars')
initCardScroll('pin-saturn')
initCardScroll('pin-constellations')
initCardScroll('pin-jupiter')

// Same toggle for the Skills stop's 2 static cards - Technical Skills
// is dense enough to actually need it; Soft Skills just automatically
// gets no button, since its own text already fits without truncating.
initCardReadMore('pin-satellites')

// Same toggle for the Testimonials stop's 2 static cards - only shows
// a "Read more" button on a quote actually long enough to overflow.
initCardReadMore('pin-testimonials')

// Build the fixed right-side navigation bar (10 stops, one dot+label
// per stop) - see src/ui/stopNav.js. Called last, after every stop's
// pin already exists (all 10 were set up inside initScrollTimeline()
// above), since this file needs to read each pin's real scroll
// position ONCE, at this point, to know where clicking an item should
// jump to. It does not create any new ScrollTrigger or Lenis instance
// of its own, and never touches scrollTimeline.js or #app.
initStopNav()
