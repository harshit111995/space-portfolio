// ===================================================================
// SATURN.JS
// This file builds Saturn - the entrepreneur-journey planet - along
// with its rings. Unlike Mars, Venus, and Earth (which already
// existed in v1 and were just moved to new positions), Saturn is the
// first genuinely NEW body added for v2.
// ===================================================================

import * as THREE from 'three'
import { updateCursorRotation } from './pointerRotation.js'

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createSaturn(sceneApi, manager) {
  // The TextureLoader is handed the shared "manager" (a
  // THREE.LoadingManager) so Saturn's loading progress is tracked
  // alongside every other texture in the scene.
  const textureLoader = new THREE.TextureLoader(manager)

  // ---- The planet itself -------------------------------------------------
  const geometry = new THREE.SphereGeometry(5, 64, 64)
  const material = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/textures/2k_saturn.webp'),
    roughness: 1,
    metalness: 0,
  })
  const saturn = new THREE.Mesh(geometry, material)

  // This is the 4%-stop marker's z (-20), offset down and to the side
  // so Saturn clears the Hero section's paragraph text (the old
  // placeholder marker overlapped it).
  //
  // Note on WHY this exact offset, not a bigger one: the camera moves
  // fast in this very first stretch of the journey (it covers the
  // same distance in the first 4% of scroll that later stops cover in
  // 8-30%), so there's very little room between the camera and this
  // stop before they're at the same depth. Pushing Saturn further
  // sideways than this to gain even more clearance would push it
  // outside the camera's view entirely for the whole approach, rather
  // than just briefly - this was checked directly, not guessed.
  //
  // A near-axis position was tested as an alternative (pulling Saturn
  // in to roughly (4, -3, -22)) to see if the camera's own banking
  // could keep it framed longer. It did not work: pulling the body
  // that close to the camera's straight path means the camera flies
  // almost THROUGH it as their z-depths cross, so instead of a brief
  // off-frame flash we got a giant, clipping close-up for several
  // percent of scroll before Saturn vanished behind the camera
  // entirely. This wider, further-out position is the confirmed
  // better tradeoff of the two.
  saturn.position.set(8, -8, -20)
  sceneApi.scene.add(saturn)

  // ---- The rings -----------------------------------------------------------
  // RingGeometry draws a flat, HOLLOW band - like a donut, not a solid
  // disc - between an inner and outer radius, which is exactly
  // Saturn's ring shape.
  const ringGeometry = new THREE.RingGeometry(6, 9, 64)

  // The same "ring alpha" image is used two ways on the material
  // below: as the alphaMap (its brightness decides what's see-through
  // versus solid - this is what actually creates the ring PATTERN,
  // rather than one plain uniform band) and as the map (so the ring
  // isn't just a flat single color).
  const ringTexture = textureLoader.load('/textures/2k_saturn_ring_alpha.webp')
  const ringMaterial = new THREE.MeshStandardMaterial({
    map: ringTexture,
    alphaMap: ringTexture,
    transparent: true,
    // A flat ring has no "inside" thickness - without DoubleSide,
    // whichever face happens to point away from the camera (as the
    // tilted ring curves around) would be invisible.
    side: THREE.DoubleSide,
    // Stops the semi-transparent ring from blocking/hiding parts of
    // Saturn behind it in the depth buffer, which would otherwise
    // create hard black edges wherever the ring crosses the planet.
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  })
  const rings = new THREE.Mesh(ringGeometry, ringMaterial)

  // RingGeometry is flat on Saturn's own local X/Y plane by default,
  // like a coin lying face-up toward the camera. Rotating it around
  // the X axis tips it up onto an angle instead, giving the classic
  // tilted look real photos of Saturn have, rather than lying
  // perfectly flat or standing perfectly on edge.
  rings.rotation.x = -Math.PI / 2.3

  // Adding the rings as a CHILD of Saturn (instead of adding them to
  // the scene directly) means they automatically move and rotate
  // together with the planet - positioning/rotating Saturn alone is
  // enough, the rings tag along for free.
  saturn.add(rings)

  // ---- Slow rotation, plus a gentle turn toward the cursor -----------------
  // cursorRotation holds Saturn's own current "how far toward the
  // cursor has it drifted" offset, eased smoothly every frame by
  // updateCursorRotation() (see src/scene/pointerRotation.js - the
  // same gentle turn-toward-cursor behavior the Moon already has).
  // previousCursorOffsetY remembers last frame's Y offset so only the
  // CHANGE since then gets added to Saturn's own rotation.y below -
  // that's what makes the cursor-follow ADD ON TOP of the steady
  // auto-spin instead of fighting or overwriting it.
  const cursorRotation = { offsetX: 0, offsetY: 0 }
  let previousCursorOffsetY = 0

  sceneApi.addUpdate(() => {
    // Saturn's own steady auto-spin - unchanged from before.
    saturn.rotation.y += 0.0004

    updateCursorRotation(cursorRotation)
    saturn.rotation.y += cursorRotation.offsetY - previousCursorOffsetY
    previousCursorOffsetY = cursorRotation.offsetY
    // rotation.x has no auto-spin of its own to protect, so the eased
    // cursor offset can just be set onto it directly.
    saturn.rotation.x = cursorRotation.offsetX
  })

  return saturn
}
