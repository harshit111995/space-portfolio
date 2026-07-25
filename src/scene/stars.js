// ===================================================================
// STARS.JS
// This file builds the background of space: a field of individual
// star points scattered all around, plus a giant Milky Way backdrop
// image that wraps around the whole scene like the inside of a globe.
// ===================================================================

import * as THREE from 'three'

// A few reference colors to mix between - real stars aren't all pure
// white, they range from cool pale blue through white to warm yellow,
// depending on how hot they are.
const STAR_COLOR_BLUE = new THREE.Color(0xbfd9ff)
const STAR_COLOR_WHITE = new THREE.Color(0xffffff)
const STAR_COLOR_YELLOW = new THREE.Color(0xfff2c8)

// Picks one random color along the blue -> white -> yellow range, so
// stars end up mostly white with a scattering of cooler and warmer
// ones mixed in.
function randomStarColor() {
  const t = Math.random()
  if (t < 0.5) {
    // First half of the range: blue fading into white.
    return STAR_COLOR_BLUE.clone().lerp(STAR_COLOR_WHITE, t / 0.5)
  }
  // Second half of the range: white fading into warm yellow.
  return STAR_COLOR_WHITE.clone().lerp(STAR_COLOR_YELLOW, (t - 0.5) / 0.5)
}

// Picks one random point on the surface of a sphere of the given
// radius, so stars end up spread out evenly all around in every
// direction rather than clumped near the top/bottom (a common mistake
// with naive random angles).
function randomPointOnSphere(radius) {
  const theta = Math.random() * Math.PI * 2 // angle around the equator
  const phi = Math.acos(Math.random() * 2 - 1) // angle from top to bottom, evenly spread
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  ]
}

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createStars(sceneApi) {
  const starCount = 12000

  // ---- Positions and colors for every star -------------------------------
  // Each star needs 3 numbers for its position (x, y, z) and 3 more
  // for its color (r, g, b), so both arrays are starCount * 3 long.
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const [x, y, z] = randomPointOnSphere(400)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const color = randomStarColor()
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  // A BufferGeometry holds raw lists of numbers like the ones above -
  // it's the most efficient way to describe thousands of simple points.
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // ---- How each star point is drawn --------------------------------------
  //   size            -> how big each star point is, in pixels
  //   sizeAttenuation -> stars farther from the camera are drawn smaller,
  //                      like real distant objects
  //   vertexColors    -> use the per-star colors set above, instead of
  //                      one flat color for every star
  //   transparent +
  //   depthWrite: false -> lets stars overlap softly without one flatly
  //                      hiding another behind it
  const material = new THREE.PointsMaterial({
    size: 1.4,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  })

  // THREE.Points draws the geometry as individual dots rather than
  // connected shapes - exactly what we want for a starfield.
  const points = new THREE.Points(geometry, material)
  sceneApi.scene.add(points)

  // ---- Slow drift ----------------------------------------------------
  // A tiny rotation added every single frame. It's a small enough
  // number that the motion is barely perceptible - just a gentle
  // drift, not a spin you'd consciously notice.
  sceneApi.addUpdate(() => {
    points.rotation.y += 0.0002
  })

  return points
}

// Builds the Milky Way backdrop: one giant sphere surrounding the
// entire scene, with a galaxy photo painted on the INSIDE of it (see
// side: THREE.BackSide below), so it looks like a backdrop no matter
// which way the camera is facing.
export function createNebula(sceneApi, manager) {
  // A big sphere (radius 500) - bigger than the star field (400) and
  // the camera's whole travel path, so it always surrounds everything.
  const geometry = new THREE.SphereGeometry(500, 60, 60)

  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so this image's loading progress can be
  // tracked/reported from one place later, alongside every other
  // texture in the scene.
  const textureLoader = new THREE.TextureLoader(manager)
  const galaxyTexture = textureLoader.load('/textures/2k_stars_milky_way.webp')

  // side: THREE.BackSide flips which face of the sphere is visible -
  // normally you'd see a sphere from the outside, but since the
  // camera lives INSIDE this sphere, we need to see it from the
  // inside instead.
  const material = new THREE.MeshBasicMaterial({
    map: galaxyTexture,
    side: THREE.BackSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  sceneApi.scene.add(mesh)

  return mesh
}
