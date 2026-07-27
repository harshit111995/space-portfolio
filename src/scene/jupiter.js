// ===================================================================
// JUPITER.JS
// This file builds Jupiter - the volunteering-stop planet. Like
// Saturn, it's a brand-new v2 body (not one repositioned from v1).
// Unlike Saturn, it has no rings - just a big banded sphere.
// ===================================================================

import * as THREE from 'three'

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createJupiter(sceneApi, manager) {
  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so Jupiter's loading progress is tracked
  // alongside every other texture in the scene.
  const textureLoader = new THREE.TextureLoader(manager)

  // Jupiter is the biggest body on the whole journey - radius 8,
  // versus Saturn's 5 - which is why the camera needs to pass much
  // farther from it (roughly 35-40 units, handled entirely by the
  // camera's S-curve weave in src/motion/scrollTimeline.js, not by
  // anything in this file).
  const geometry = new THREE.SphereGeometry(8, 64, 64)
  const material = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_jupiter.webp'),
    roughness: 1,
    metalness: 0,
  })
  const jupiter = new THREE.Mesh(geometry, material)

  // This is the 84%-stop's z (-200). The x/y offset just needs to put
  // Jupiter reasonably off to one side - the camera's own weave (in
  // scrollTimeline.js) is what actually creates the safe flyby
  // distance, not this position alone (the same lesson learned from
  // Saturn: a body's OWN position barely matters for framing once the
  // camera actively weaves around and looks AT it).
  jupiter.position.set(14, -10, -200)
  sceneApi.scene.add(jupiter)

  // ---- Slow rotation ---------------------------------------------------
  // Real Jupiter spins faster than any other planet, so it gets a
  // slightly quicker turn than Saturn's - still gentle, not dizzying.
  sceneApi.addUpdate(() => {
    jupiter.rotation.y += 0.0007
  })

  return jupiter
}
