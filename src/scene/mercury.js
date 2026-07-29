// ===================================================================
// MERCURY.JS
// This file builds Mercury - the testimonials-stop planet. Until now
// this stop only had a placeholder wireframe box standing in for a
// real body (see addPlaceholderMarkers() in src/motion/scrollTimeline.js)
// - this is that real body, replacing it. Just one plain sphere, the
// same basic recipe as Mars/Venus/Earth in src/scene/planets.js - no
// rings, no moons, nothing extra, since Mercury itself doesn't have
// any of those.
// ===================================================================

import * as THREE from 'three'
import { updateCursorRotation } from './pointerRotation.js'

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createMercury(sceneApi, manager) {
  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so Mercury's loading progress is tracked
  // alongside every other texture in the scene, the same as every
  // other body.
  const textureLoader = new THREE.TextureLoader(manager)

  // Mercury is the smallest of the planets shown on this site, so its
  // radius (3.5) is deliberately smaller than Mars/Venus/Earth/Saturn/
  // Jupiter's - a small, plain grey-brown world, not a dramatic
  // centerpiece like those.
  const geometry = new THREE.SphereGeometry(3.5, 48, 48)
  const material = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_mercury.webp'),
    roughness: 1,
    metalness: 0,
  })
  const mercury = new THREE.Mesh(geometry, material)

  // This is exactly the testimonials stop's own marker position (see
  // the "testimonials" entry in src/motion/scrollTimeline.js) - the
  // camera's hold/weave for this stop already aims at and frames
  // whatever sits at that exact spot, so putting Mercury here (instead
  // of picking a new position) is what makes it show up correctly
  // framed without needing any changes to the camera logic itself.
  mercury.position.set(-10, 0, -230)
  sceneApi.scene.add(mercury)

  // ---- Slow rotation, plus a gentle turn toward the cursor -----------------
  // A tiny rotation added every frame, the same technique used for
  // every other planet - just enough to feel alive, not a fast spin.
  // cursorRotation/previousCursorOffsetY add the same gentle
  // turn-toward-cursor behavior the Moon already has (see
  // src/scene/pointerRotation.js) ON TOP of that auto-spin - only the
  // CHANGE in the eased cursor offset since last frame gets added to
  // rotation.y, so the two effects add together instead of one
  // overwriting the other.
  const cursorRotation = { offsetX: 0, offsetY: 0 }
  let previousCursorOffsetY = 0

  sceneApi.addUpdate(() => {
    mercury.rotation.y += 0.0005

    updateCursorRotation(cursorRotation)
    mercury.rotation.y += cursorRotation.offsetY - previousCursorOffsetY
    previousCursorOffsetY = cursorRotation.offsetY
    // rotation.x has no auto-spin of its own to protect, so the eased
    // cursor offset can just be set onto it directly.
    mercury.rotation.x = cursorRotation.offsetX
  })

  return mercury
}
