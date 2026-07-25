// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout), starts
// up the 3D scene on the <canvas id="webgl">, turns on smooth
// scrolling for the page, builds the moon, and connects scrolling to
// the camera's movement through the scene.
import './styles/base.css'
import * as THREE from 'three'
import scene from './scene/scene.js'
import { createMoon } from './scene/moon.js'
import './motion/lenis.js'
import { init as initScrollTimeline } from './motion/scrollTimeline.js'

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

// Hook up scrolling so it drives the camera's journey through space.
initScrollTimeline(scene.camera)
