// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout), starts
// up the 3D scene on the <canvas id="webgl">, and turns on smooth
// scrolling for the page.
import './styles/base.css'
import './scene/scene.js'
import './motion/lenis.js'

// Importing scene.js above runs its setup code right away: it builds
// the 3D scene, camera, lights, and a temporary test sphere, then
// starts the animation loop that draws it every frame.

// Importing lenis.js above turns on smooth scrolling and connects it
// to GSAP's shared animation loop. Nothing else needs to happen here
// yet.
