// ===================================================================
// PLANETS.JS
// This file builds the three planets the camera flies past on its
// way through the scene: Mars, Venus, and Earth. Each one slowly
// spins in place.
// ===================================================================

import * as THREE from 'three'

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createPlanets(sceneApi, manager) {
  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so every planet's loading progress can be
  // tracked/reported from one place later, alongside the moon and the
  // Milky Way backdrop.
  const textureLoader = new THREE.TextureLoader(manager)

  // ---- Mars ------------------------------------------------------------
  // roughness: 1, metalness: 0 -> a fully matte, non-metallic surface,
  // like real rock and dust (used for all three planets below too).
  const marsGeometry = new THREE.SphereGeometry(4, 48, 48)
  const marsMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_mars.webp'),
    roughness: 1,
    metalness: 0,
  })
  const mars = new THREE.Mesh(marsGeometry, marsMaterial)
  // v2 spine: repositioned onto the new 12%-stop marker (z=-50) from
  // src/motion/scrollTimeline.js, replacing that wireframe placeholder
  // with this real, already-textured planet.
  //
  // Moved from +x to -x (mirrored) for the S-curve weave test: Saturn
  // sits at +x, so Mars needs to sit on the opposite side to prove the
  // camera's weave works swinging BOTH directions, not just one.
  mars.position.set(-10, 1, -50)
  sceneApi.scene.add(mars)

  // ---- Venus -------------------------------------------------------------
  const venusGeometry = new THREE.SphereGeometry(5, 48, 48)
  const venusMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_venus_surface.webp'),
    roughness: 1,
    metalness: 0,
  })
  const venus = new THREE.Mesh(venusGeometry, venusMaterial)
  // v2 spine: repositioned onto the new 37%-stop marker (z=-80),
  // replacing that wireframe placeholder.
  venus.position.set(-10, -2, -80)
  sceneApi.scene.add(venus)

  // ---- Earth ---------------------------------------------------------------
  // Just one sphere, textured with the daymap (continents/oceans) -
  // there used to be a second, very slightly bigger sphere sitting on
  // top of this one for clouds, but that cloud texture turned out to
  // have no real transparency in it at all (checked directly: every
  // single pixel came back fully opaque, alpha 255) - so instead of
  // letting the surface show through wispy gaps like a real cloud
  // layer, it was just a solid, opaque, mostly-white shell completely
  // hiding the daymap underneath. Removed entirely rather than kept,
  // since patching that would mean reprocessing the texture itself
  // (baking real transparency into it), not just a code change here.
  const earthGeometry = new THREE.SphereGeometry(6, 64, 64)
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_earth_daymap.webp'),
    roughness: 1,
    metalness: 0,
  })
  const earth = new THREE.Mesh(earthGeometry, earthMaterial)
  // v2 spine: repositioned onto the new 96%-stop marker (z=-260),
  // near the end of the journey by Contact, replacing that wireframe
  // placeholder.
  //
  // Pulled much closer to the camera's central axis than Jupiter/
  // Saturn/Mars (10 -> 5 on x) for the S-curve camera phase: Earth is
  // the journey's destination, not a body being passed on the way to
  // somewhere else, so its arrival is meant to read as a more direct,
  // centered approach rather than a wide flyby.
  earth.position.set(5, -3, -260)
  sceneApi.scene.add(earth)

  // ---- Slow rotation for each planet --------------------------------------
  // A tiny rotation added every single frame for each planet. Larger
  // numbers spin faster - Mars turns quickest, Venus slowest, Earth in
  // between.
  sceneApi.addUpdate(() => {
    mars.rotation.y += 0.0008
    venus.rotation.y += 0.0005
    earth.rotation.y += 0.0006
  })

  return { mars, venus, earth }
}
