// ===================================================================
// SATELLITES.JS
// This file builds the 6 satellites at the skills stop. Like the
// asteroids, there's no downloaded model here - each little craft is
// assembled by hand in code out of simple shapes (a box for the body,
// flat panels for solar wings, a cone for the dish), grouped together
// so they move and rotate as one object instead of 4 separate pieces.
// ===================================================================

import * as THREE from 'three'

// ---- Building one satellite ------------------------------------------
// bodyMaterial and panelMaterial are shared across all 6 satellites
// (passed in rather than recreated here) - there's no reason for each
// craft to have its own copy of the exact same material.
function createSatelliteGroup(bodyMaterial, panelMaterial) {
  // A THREE.Group isn't a shape itself - it's a container that holds
  // several meshes and treats them as one unit. Moving or rotating
  // the GROUP moves/rotates everything inside it together, which is
  // exactly what keeps the body, panels, and dish locked together as
  // one satellite instead of drifting apart.
  const group = new THREE.Group()

  // ---- The central body --------------------------------------------------
  // A small cube, roughly 1 unit across - everything else below is
  // positioned relative to ITS size, so if this size ever changes,
  // the panels/dish still line up flush against it.
  const bodySize = 0.8
  const bodyGeometry = new THREE.BoxGeometry(bodySize, bodySize, bodySize)
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)

  // ---- The two solar panel wings ---------------------------------------
  // Thin, wide flat boxes - "thin" is what makes a box read as a flat
  // panel instead of a brick. Both panels share one geometry (they're
  // identical shapes, just mirrored in position), which is lighter on
  // the GPU than making two separate copies.
  const panelWidth = 1.5
  const panelGeometry = new THREE.BoxGeometry(panelWidth, 0.6, 0.05)

  // Positioning math: the body's own half-width (bodySize / 2) is
  // where its side face is. Adding the panel's own half-width on top
  // of that places the panel so its INNER edge sits flush against the
  // body's face, instead of floating away from it or burying itself
  // inside the body.
  const panelOffset = bodySize / 2 + panelWidth / 2

  const panelRight = new THREE.Mesh(panelGeometry, panelMaterial)
  panelRight.position.x = panelOffset
  group.add(panelRight)

  const panelLeft = new THREE.Mesh(panelGeometry, panelMaterial)
  panelLeft.position.x = -panelOffset
  group.add(panelLeft)

  // ---- The dish, on the front -----------------------------------------------
  // A small cone standing in for a satellite dish/antenna. A cone's
  // default "up" direction is +Y (pointing away from its own flat
  // base) - rotating it 90 degrees around X tips it over so it points
  // along +Z instead, which is the direction we're calling "front."
  const dishHeight = 0.35
  const dishGeometry = new THREE.ConeGeometry(0.25, dishHeight, 12)
  const dish = new THREE.Mesh(dishGeometry, bodyMaterial)
  dish.rotation.x = Math.PI / 2
  // Same flush-against-the-body logic as the panels above, just along
  // the front (Z) axis instead of sideways (X).
  dish.position.z = bodySize / 2 + dishHeight / 2
  group.add(dish)

  return group
}

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createSatellites(scene) {
  // ---- Shared materials -----------------------------------------------------
  // Metallic body: low roughness + high metalness together is what
  // makes something look like polished metal instead of matte
  // plastic or stone (compare to the asteroids' roughness 0.9,
  // metalness 0.1 - almost the exact opposite combination).
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xb0b4b8,
    roughness: 0.4,
    metalness: 0.8,
  })

  // A cooler, bluish tone for the panels so they read as a distinct
  // part (real solar panels usually look different from the metal
  // chassis they're attached to), less metallic than the body.
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f5f8f,
    roughness: 0.5,
    metalness: 0.3,
  })

  // ---- Arranging 6 satellites in a loose ring ------------------------------
  // The skills stop marker used to sit at (-10, 0, -170) (see
  // src/motion/scrollTimeline.js). The 6 satellites are spaced evenly
  // around that point on a circle - like a loose orbit - rather than
  // scattered by hand (6 evenly-spaced points is simpler to get right
  // than picking 6 positions individually, and reads more like an
  // "orbiting cluster" than a random pile).
  //
  // Radius 6 makes the whole ring 12 units across (radius x 2) -
  // matching the "~12 units across" target - and keeps neighboring
  // satellites (each roughly 3.8 units wide once its panels are
  // counted) a safe 6 units apart center-to-center, comfortably clear
  // of touching each other.
  const center = { x: -10, y: 0, z: -170 }
  const radius = 6
  const satelliteCount = 6

  const satellites = []
  for (let i = 0; i < satelliteCount; i++) {
    const angle = (i / satelliteCount) * Math.PI * 2
    const satellite = createSatelliteGroup(bodyMaterial, panelMaterial)

    // A little alternating depth offset (forward/back along z) keeps
    // the ring from looking perfectly flat - a real loose cluster
    // wouldn't all sit on exactly the same plane.
    const depthJitter = i % 2 === 0 ? 1.5 : -1.5

    satellite.position.set(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle),
      center.z + depthJitter,
    )

    // Facing each satellite's "front" (the dish) outward, away from
    // the cluster's center, so all 6 aren't just facing one shared
    // direction like a stack of identical toys.
    satellite.rotation.y = angle

    scene.scene.add(satellite)

    // Stored alongside its own orbit angle/speed and self-spin speed,
    // so the update loop below can move each one independently.
    satellites.push({
      mesh: satellite,
      angle,
      // A different orbit speed and spin speed per satellite (based
      // on its index) is what stops all 6 from drifting/rotating in
      // perfect lockstep with each other.
      orbitSpeed: 0.00015 + i * 0.00003,
      spinSpeed: 0.001 + i * 0.0004,
      depthJitter,
    })
  }

  // ---- Gentle drift + rotation, every frame ---------------------------------
  scene.addUpdate(() => {
    for (const s of satellites) {
      // Slowly spinning each satellite on its own - this is the
      // "feels alive" motion, independent of the orbit below.
      s.mesh.rotation.y += s.spinSpeed

      // Slowly orbiting the whole cluster's center by nudging this
      // satellite's stored angle forward and re-deriving its x/y
      // position from it every frame - the same circle-position math
      // used to place it originally, just re-run continuously.
      s.angle += s.orbitSpeed
      s.mesh.position.x = center.x + radius * Math.cos(s.angle)
      s.mesh.position.y = center.y + radius * Math.sin(s.angle)
    }
  })

  return satellites.map((s) => s.mesh)
}
