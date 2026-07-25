// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout), starts
// up the 3D scene on the <canvas id="webgl">, turns on smooth
// scrolling for the page, builds the moon and the starry backdrop,
// and connects scrolling to the camera's movement through the scene.
import './styles/base.css'
import './styles/panels.css'
import * as THREE from 'three'
import scene from './scene/scene.js'
import { createMoon } from './scene/moon.js'
import { createStars, createNebula } from './scene/stars.js'
import { createPlanets } from './scene/planets.js'
import { registerTarget, initRaycaster } from './scene/raycaster.js'
import './motion/lenis.js'
import { init as initScrollTimeline } from './motion/scrollTimeline.js'
import { initTextReveals } from './motion/textReveal.js'
import { initDragLook } from './ui/cursor.js'

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

// Build the moon and add it into the 3D scene.
createMoon(scene, manager)

// Build the star field and the Milky Way backdrop that surrounds it.
createStars(scene)
createNebula(scene, manager)

// Build Mars, Venus, and Earth (with its clouds) along the camera's path.
const { mars, venus, earth } = createPlanets(scene, manager)

// Make each planet hoverable: moving the mouse over one shows its
// matching HTML panel and switches the cursor to a pointer.
registerTarget(mars, 'panel-experience')
registerTarget(venus, 'panel-casestudies')
registerTarget(earth, 'panel-contact')
initRaycaster(scene.camera)

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
