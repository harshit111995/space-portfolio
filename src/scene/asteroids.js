// ===================================================================
// ASTEROIDS.JS
// This file builds the 3 asteroids at the education stop. Unlike
// every other body so far (a sphere with a photo texture wrapped
// around it), these are PROCEDURAL - there's no "asteroid photo" to
// use, so instead we start with a smooth, simple shape (an
// icosahedron - a 20-sided ball, a common starting point for rocky
// shapes) and manually push its surface in and out at random to make
// it look like a lumpy, irregular rock instead of a smooth ball.
// ===================================================================

import * as THREE from 'three'

// ---- A tiny, deterministic "random" number generator ---------------------
// Real Math.random() gives a different result every time you call it,
// which is no good here - we want the SAME asteroid to look the same
// on every visit, not reshuffle itself every reload. This function
// instead produces a number that only depends on its inputs (a
// vertex's x/y/z position, plus a "seed" number) - same inputs always
// give the same output, but small changes to the seed produce a
// totally different, unrelated-looking pattern. This is a common,
// cheap trick (multiply by large arbitrary numbers, take the sine,
// keep only the fractional part) - not "true" randomness, just
// something that looks random enough for a bumpy rock surface.
function pseudoRandom(x, y, z, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 91.7) * 43758.5453
  return value - Math.floor(value) // keep just the fractional part -> a number between 0 and 1
}

// ---- Building one lumpy rock ---------------------------------------------
// seed is the only thing that makes one asteroid look different from
// another - three different seeds fed into the exact same shape logic
// produce three DIFFERENT bumpy patterns, instead of three identical
// bumpy balls.
function createLumpyRockGeometry(seed) {
  // IcosahedronGeometry(radius, detail) - detail 1 subdivides the
  // basic 20-sided shape once, giving enough vertices (42) to look
  // convincingly lumpy once we push them around, without being so
  // many that it's expensive to compute.
  const geometry = new THREE.IcosahedronGeometry(2, 1)

  // "position" here is the list of every vertex's x/y/z location -
  // reading and rewriting this is literally reshaping the geometry.
  const positionAttribute = geometry.attributes.position
  const vertex = new THREE.Vector3()

  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i)

    // Since this shape is centered on the origin, a vertex's own
    // (normalized) position IS the direction pointing straight out
    // from the center through that vertex - exactly the direction we
    // want to push it further out, or pull it further in.
    const outwardDirection = vertex.clone().normalize()

    // A pseudo-random number from 0 to 1, turned into a small push
    // ranging roughly -0.4 to +0.4 (radius 2, so this is up to a 20%
    // bump in or out - noticeable, but not so much it stops reading
    // as a roughly round rock).
    const noise = pseudoRandom(vertex.x, vertex.y, vertex.z, seed)
    const displacement = (noise - 0.5) * 0.8

    vertex.addScaledVector(outwardDirection, displacement)
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }

  // Tell Three.js the positions were changed by hand, so it re-uploads
  // them to the GPU instead of using the old, smooth ones.
  positionAttribute.needsUpdate = true

  // Lighting depends on which way each little surface patch (each
  // triangle) is facing - after moving vertices around, the OLD
  // lighting directions are wrong, so they need recalculating from
  // the new, bumpy shape. Skipping this would make the rock look
  // lit incorrectly, like the bumps aren't really there.
  geometry.computeVertexNormals()

  return geometry
}

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createAsteroids(scene) {
  // One shared grey, rocky-looking material for all 3 - stone, not
  // shiny plastic: high roughness (0.9, close to fully matte) and
  // just a touch of metalness (0.1) for the faint mineral glint real
  // asteroids have.
  const material = new THREE.MeshStandardMaterial({
    color: 0x8c8c8c,
    roughness: 0.9,
    metalness: 0.1,
  })

  // The education stop's marker used to sit at (10, 0, -140) (see
  // src/motion/scrollTimeline.js). The 3 asteroids are scattered in a
  // loose cluster around that same spot, each nudged a few units off
  // in a different direction so none of them sit in the exact same
  // place or touch each other.
  const positions = [
    [7, 2, -138],
    [13, -2, -141],
    [10, -3, -137],
  ]

  // A different seed per rock is THE important part of this file -
  // without it, all 3 would run through identical noise and come out
  // as three identical bumpy balls, defeating the entire point of
  // making them procedural instead of just reusing one shape 3 times.
  const seeds = [17, 53, 91]

  // Each asteroid also tumbles on its own different axis/speed, set
  // up below, so they visibly don't spin in lockstep with each other.
  const spins = [
    { x: 0.002, y: 0.0013, z: 0 },
    { x: 0, y: 0.0021, z: 0.0009 },
    { x: 0.0011, y: 0, z: 0.0017 },
  ]

  const asteroids = positions.map((position, i) => {
    const geometry = createLumpyRockGeometry(seeds[i])
    const asteroid = new THREE.Mesh(geometry, material)
    asteroid.position.set(position[0], position[1], position[2])
    scene.scene.add(asteroid)
    return asteroid
  })

  // ---- Slow tumbling, each rock on its own axis/speed -----------------------
  scene.addUpdate(() => {
    asteroids.forEach((asteroid, i) => {
      asteroid.rotation.x += spins[i].x
      asteroid.rotation.y += spins[i].y
      asteroid.rotation.z += spins[i].z
    })
  })

  return asteroids
}
