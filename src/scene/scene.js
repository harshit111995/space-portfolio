// ===================================================================
// SCENE.JS
// This file sets up the 3D "world" that gets drawn onto the
// <canvas id="webgl"> sitting behind the page content. It's built
// once, here, and other files can later add their own 3D objects or
// animations to it without needing to duplicate any of this setup.
// ===================================================================

import * as THREE from 'three'
import { getQuality } from './quality.js'

// Grab the canvas that's already sitting in index.html. We don't
// create a new canvas - we just tell Three.js to draw into this one.
const canvas = document.querySelector('#webgl')

// ---- Scene ----------------------------------------------------------
// The Scene is the empty 3D "world" that every light and object gets
// placed into.
const scene = new THREE.Scene()

// ---- Camera ----------------------------------------------------------
// The camera is our "eye" into the 3D scene.
//   45          -> field of view, in degrees (how wide the view is)
//   aspect      -> width/height ratio, so things don't look stretched
//   0.1 / 2000  -> near/far clipping planes: objects closer than 0.1
//                  or farther than 2000 units away won't be drawn
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
)
// Pull the camera back along the z-axis so it can see objects placed
// at the center of the scene (position 0,0,0).
camera.position.z = 10

// ---- Renderer ----------------------------------------------------------
// The renderer does the actual drawing of the 3D scene onto our canvas,
// every single frame.
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true, // smooths out jagged edges on shapes
  alpha: true, // lets the page's dark background show through
})

// High-end screens can report a devicePixelRatio of 3 or more.
// Capping it keeps things sharp without wasting performance - mobile
// gets a lower cap (1.5 instead of 2) since rendering extra pixels is
// more costly for weaker phone GPUs. getQuality() is checked once
// here, when the scene first loads, and that same answer is reused
// below on resize - it's never re-checked per frame.
const maxPixelRatio = getQuality() === 'mobile' ? 1.5 : 2
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
renderer.setSize(window.innerWidth, window.innerHeight)

// Tone mapping + color space: these settings make lighting and colors
// look natural and film-like instead of flat and washed out.
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace

// ---- Lights ----------------------------------------------------------
// AmbientLight: a soft, dim light that reaches every object equally
// from all directions, so nothing ends up pitch black.
const ambientLight = new THREE.AmbientLight(0x404060, 0.4)
scene.add(ambientLight)

// DirectionalLight: acts like sunlight - parallel rays coming from one
// direction. Positioned up and off to the side so objects catch a
// highlight on one side.
const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 3, 5)
scene.add(directionalLight)

// ---- Keeping things the right size on window resize ----------------------
// Whenever the browser window changes size, the camera and renderer
// need to be told the new size, or the scene will look stretched or
// blurry.
function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  // Reuses the same maxPixelRatio decided once above - resizing the
  // window doesn't change whether this counts as "mobile."
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', handleResize)

// ---- The animation loop ----------------------------------------------
// Instead of every future feature starting its own separate animation
// loop (which would waste performance), everything registers itself
// here via addUpdate(), and we run all of them from one single loop,
// once per frame, right before drawing.
const updateCallbacks = []

function addUpdate(fn) {
  updateCallbacks.push(fn)
}

function tick() {
  for (const fn of updateCallbacks) {
    fn()
  }
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()

// Export everything so other files can read from or add to this scene
// later (for example, adding real 3D models or animations via
// addUpdate) without recreating any of the setup above.
export default {
  scene,
  camera,
  renderer,
  addUpdate,
}
