// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout), starts
// up the 3D scene on the <canvas id="webgl">, turns on smooth
// scrolling for the page, builds the moon and the starry backdrop,
// and connects scrolling to the camera's movement through the scene.
import './styles/base.css'
import './styles/portrait.css'
import './styles/content.css'
import * as THREE from 'three'
import scene from './scene/scene.js'
import { createMoon } from './scene/moon.js'
import { createStars, createNebula } from './scene/stars.js'
import { createPlanets } from './scene/planets.js'
import { createSaturn } from './scene/saturn.js'
import { createJupiter } from './scene/jupiter.js'
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
import { initCertificatePanels } from './ui/certificatePanels.js'
import { initScrollCards } from './motion/scrollCards.js'

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

// Build Mars, Venus, and Earth (with its clouds) along the camera's path.
const { mars, venus, earth } = createPlanets(scene, manager)

// Build Saturn (the entrepreneur-journey planet) at the 4% stop - the
// first brand-new v2 body, not just a repositioned v1 one.
const saturn = createSaturn(scene, manager)

// Build Jupiter (the volunteering-stop planet) at the 84% stop.
const jupiter = createJupiter(scene, manager)

// Build the 3 procedural asteroids at the education stop (74%). No
// LoadingManager needed here - unlike every other body so far, these
// are built from pure shape math, not a downloaded photo texture.
const asteroids = createAsteroids(scene)

// Build the 6 procedural satellites at the skills stop (78%). Also no
// LoadingManager needed - these are assembled entirely from
// primitives (boxes and a cone), not a downloaded texture.
const satellites = createSatellites(scene)

// Build the 8 certificate constellations at the certificates stop
// (69%). Also no LoadingManager needed - the star glow is a small
// canvas-drawn sprite, not a downloaded texture.
const constellations = createConstellations(scene)

// v2: the old v1 single hover-panel-per-planet behavior (built in
// src/scene/raycaster.js) is retired - nothing has called
// registerTarget() on it in a long time, and it's no longer switched
// on here either. It's left in place, unused, rather than deleted, in
// case a similar planet-hover system is wanted again later - but
// actually calling initRaycaster() here was doing real, active harm:
// with zero targets registered, its own per-frame check ALWAYS "hits
// nothing," which made it forcibly reset the cursor back to "default"
// on every single frame - fighting with and overriding the NEW
// constellation hover cursor set up below in
// src/ui/certificatePanels.js. Found and confirmed directly while
// building that feature (the cursor kept flickering back to normal
// instead of staying as a pointer over a clickable constellation).

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

// Let the visitor click any of the 8 certificate constellations to
// open that issuer's certificate panel, at the certificates stop.
initCertificatePanels(scene.camera, constellations)

// Cross-fade between the 3 entrepreneur cards as the visitor scrolls
// through Saturn's held pin.
initScrollCards('pin-saturn', 3)
