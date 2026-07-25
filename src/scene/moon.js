// ===================================================================
// MOON.JS
// This file builds one 3D object - a moon - and adds it to the scene
// set up in scene.js. It also makes the moon gently follow the
// mouse, rotating a little as you move the cursor around.
// ===================================================================

import * as THREE from 'three'

// ---- Tracking the mouse position ------------------------------------
// These two numbers store where the mouse currently is, "normalized"
// to a small range roughly from -1 to 1: 0 means the middle of the
// screen, negative means left/top, positive means right/bottom.
// They get updated on every mouse movement, and read once per frame
// further down (in the addUpdate callback) to smoothly rotate the moon.
let mouseX = 0
let mouseY = 0

window.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1
  mouseY = (event.clientY / window.innerHeight) * 2 - 1
})

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene), plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createMoon(sceneApi, manager) {
  // ---- Shape -----------------------------------------------------------
  // A sphere with lots of segments (64 across, 64 down) so the bumps
  // added by the displacement map below look smooth instead of blocky.
  const geometry = new THREE.SphereGeometry(3, 64, 64)

  // ---- Textures ----------------------------------------------------------
  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so that loading progress for these images
  // can be tracked/reported from one place later, instead of each
  // object loading its own images in isolation.
  const textureLoader = new THREE.TextureLoader(manager)
  const colorMap = textureLoader.load('/textures/moon_color.webp')
  const displacementMap = textureLoader.load('/textures/moon_disp.jpg')

  // ---- Material ----------------------------------------------------------
  //   map                -> the color photo texture painted onto the sphere
  //   displacementMap    -> a black-and-white image used to actually push
  //                         the surface in and out, creating real craters
  //                         and bumps rather than just a flat picture
  //   displacementScale  -> how far the surface can be pushed, in scene units
  //   roughness          -> how matte (1) vs shiny (0) the surface looks
  //   metalness          -> how metallic the surface looks (0 = not at all)
  const material = new THREE.MeshStandardMaterial({
    map: colorMap,
    displacementMap: displacementMap,
    displacementScale: 0.08,
    roughness: 0.95,
    metalness: 0,
  })

  const mesh = new THREE.Mesh(geometry, material)

  // Push the moon down below center so only its upper portion shows
  // in the viewport - it "crops" off the bottom edge of the screen.
  mesh.position.set(0, -3.2, 0)
  sceneApi.scene.add(mesh)

  // ---- Gentle mouse-follow rotation --------------------------------------
  // Rather than snapping the moon's rotation straight to the mouse
  // position (which would look jittery), we nudge it a little closer
  // to its target every frame. This "damping" (a lerp, or linear
  // interpolation) is what makes the motion feel smooth and delayed,
  // like it has a little weight to it.
  const dampFactor = 0.05

  sceneApi.addUpdate(() => {
    const targetRotationY = mouseX * 0.3
    const targetRotationX = mouseY * 0.15

    // Move the current rotation part-way (5%) toward the target,
    // every single frame, instead of jumping straight there.
    mesh.rotation.y += (targetRotationY - mesh.rotation.y) * dampFactor
    mesh.rotation.x += (targetRotationX - mesh.rotation.x) * dampFactor
  })

  return mesh
}
