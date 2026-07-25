// ===================================================================
// PLANETS.JS
// This file builds the three planets the camera flies past on its
// way through the scene: Mars, Venus, and Earth (with its own layer
// of clouds on top). Each one slowly spins in place.
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
  // Moved closer to the camera's path and slightly ahead of the
  // camera's z=-45 keyframe, so Mars is already growing into view
  // (not edge-on and tiny) by the time the camera arrives.
  mars.position.set(6, 1, -55)
  sceneApi.scene.add(mars)

  // ---- Venus -------------------------------------------------------------
  const venusGeometry = new THREE.SphereGeometry(5, 48, 48)
  const venusMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_venus_surface.webp'),
    roughness: 1,
    metalness: 0,
  })
  const venus = new THREE.Mesh(venusGeometry, venusMaterial)
  // Moved closer to the camera's path and slightly ahead of the
  // camera's z=-80 keyframe, for the same reason as Mars above.
  venus.position.set(-7, -2, -92)
  sceneApi.scene.add(venus)

  // ---- Earth ---------------------------------------------------------------
  const earthGeometry = new THREE.SphereGeometry(6, 64, 64)
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_earth_daymap.webp'),
    roughness: 1,
    metalness: 0,
  })
  const earth = new THREE.Mesh(earthGeometry, earthMaterial)
  // Re-tuned again: centering Earth's x back to 0 and pushing it
  // further out to z=-185 (paired with extending the camera's final
  // keyframe to z=-168 in scrollTimeline.js) gives more travel room
  // before the journey ends, so Earth stays in view longer instead of
  // swinging off-screen right as the camera arrives.
  earth.position.set(0, -1, -185)
  sceneApi.scene.add(earth)

  // Earth's clouds: a second sphere, very slightly bigger (6.1 vs 6)
  // than Earth itself, so it sits just above the surface like a real
  // atmosphere layer instead of clipping into the ground.
  //   transparent + depthWrite: false -> lets the clouds look soft and
  //   let the surface underneath show through the gaps, rather than
  //   the cloud layer being a solid opaque shell.
  const cloudsGeometry = new THREE.SphereGeometry(6.1, 64, 64)
  const cloudsMaterial = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_earth_clouds.webp'),
    transparent: true,
    depthWrite: false,
  })
  const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
  // Adding the clouds as a CHILD of the earth mesh (instead of adding
  // it to the scene directly) means it automatically moves and
  // rotates together with Earth - we only have to position/rotate
  // Earth itself, and the clouds tag along.
  earth.add(clouds)

  // ---- Slow rotation for each planet --------------------------------------
  // A tiny rotation added every single frame for each planet. Larger
  // numbers spin faster - Mars turns quickest, Venus slowest, Earth in
  // between. The clouds get a slightly bigger number than Earth so
  // they visibly drift over the surface instead of looking painted on.
  sceneApi.addUpdate(() => {
    mars.rotation.y += 0.0008
    venus.rotation.y += 0.0005
    earth.rotation.y += 0.0006
    clouds.rotation.y += 0.0009
  })

  return { mars, venus, earth }
}
