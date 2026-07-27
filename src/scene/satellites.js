// ===================================================================
// SATELLITES.JS
// This file builds the 6 satellites at the skills stop. Like the
// asteroids, there's no downloaded model here - each little craft is
// assembled by hand in code out of simple shapes, grouped together so
// they move and rotate as one object instead of separate pieces.
//
// ---- Redesign note ---------------------------------------------------
// The first version was verified only up CLOSE, where it looked like a
// fine little assembled craft. Screenshotting it from the actual
// fly-by distance (15-20 units - where the camera will really see it)
// showed the truth: at that distance it just read as a few small
// disconnected boxes, not a satellite. The fixes below are all about
// being recognizable from far away, not just correct up close:
// bigger, more dominant panels (the single most recognizable feature
// of a satellite silhouette), a body material that actually catches
// the light instead of going dark, and an overall bigger size so none
// of it disappears into a speck at real viewing distance.
// ===================================================================

import * as THREE from 'three'

// ---- A tiny procedural texture for the solar panels -----------------------
// Instead of downloading a photo of a solar panel, this draws one: a
// dark blue background with a grid of lighter lines over it, using the
// browser's own 2D canvas drawing (the same thing you'd use to draw on
// a web page) rendered to an offscreen image instead of the screen.
// That image is then wrapped onto the panel like a sticker - Three.js
// calls this a "texture." Repeating it a few times across the panel is
// what makes it read as many small solar CELLS instead of one plain
// rectangle.
function createSolarPanelTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const context = canvas.getContext('2d')

  // The dark blue base color of the panel itself.
  context.fillStyle = '#0b1f3a'
  context.fillRect(0, 0, canvas.width, canvas.height)

  // A grid of slightly lighter lines on top, evenly spaced - this is
  // what creates the "many small cells" look real solar panels have.
  context.strokeStyle = '#3d7cc9'
  context.lineWidth = 2
  const cellSize = 16
  for (let x = 0; x <= canvas.width; x += cellSize) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, canvas.height)
    context.stroke()
  }
  for (let y = 0; y <= canvas.height; y += cellSize) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvas.width, y)
    context.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  // RepeatWrapping + repeat.set(...) tiles this same small image
  // across the panel's surface multiple times, instead of stretching
  // one copy of it thin across the whole wide panel.
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 1)
  return texture
}

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

  // ---- The central body: now a cylinder, not a cube ------------------------
  // A cylinder reads more clearly as a satellite "bus" (the industry
  // term for a satellite's main body) than a plain cube does, and its
  // rounded side catches light in a way a flat cube face doesn't.
  // Bigger overall than before (0.8 cube -> this), which matters once
  // this is viewed from 15-20 units away instead of up close.
  const bodyRadius = 0.6
  const bodyHeight = 1.8
  const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 16)
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)

  // ---- The two solar panel wings: now much bigger and more prominent -------
  // This is the single most important change. A satellite's silhouette
  // is basically defined by its wide flat panels - at a distance, the
  // small body all but disappears, but wide panels catching the light
  // still read clearly. panelWidth nearly tripled from the first
  // version (1.5 -> this) specifically so they dominate the shape.
  const panelWidth = 2.6
  const panelHeight = 1.1
  const panelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, 0.06)

  // Positioning math (unchanged idea from before, just bigger numbers):
  // the body's own half-width (radius) is where its side surface is.
  // Adding the panel's own half-width on top of that places the panel
  // so its INNER edge sits flush against the body, instead of
  // floating away from it or burying itself inside.
  const panelOffset = bodyRadius + panelWidth / 2

  const panelRight = new THREE.Mesh(panelGeometry, panelMaterial)
  panelRight.position.x = panelOffset
  group.add(panelRight)

  const panelLeft = new THREE.Mesh(panelGeometry, panelMaterial)
  panelLeft.position.x = -panelOffset
  group.add(panelLeft)

  // ---- The dish, offset from the body's center -----------------------------
  // A small cone standing in for a dish/antenna. A cone's default "up"
  // direction is +Y (pointing away from its own flat base) - rotating
  // it 90 degrees around X tips it over so it points along +Z instead,
  // which is the direction we're calling "front." It's mounted off to
  // one side and slightly up (not dead-center) so it reads as a
  // separate, MOUNTED instrument, the way a real dish is bolted onto
  // the side of a satellite bus rather than being its literal nose.
  const dishHeight = 0.5
  const dishGeometry = new THREE.ConeGeometry(0.35, dishHeight, 16)
  const dish = new THREE.Mesh(dishGeometry, bodyMaterial)
  dish.rotation.x = Math.PI / 2
  dish.position.set(0.35, bodyHeight / 2 - 0.2, bodyRadius + dishHeight / 2)
  group.add(dish)

  return group
}

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createSatellites(scene) {
  // ---- Shared materials -----------------------------------------------------
  // The body is now a warm, gold-foil-like metallic material (real
  // satellites are often wrapped in gold or silver foil insulation) -
  // color alone won't catch light convincingly, so pairing a warm
  // color with high metalness (0.9) and fairly low roughness (0.35) is
  // what actually makes it shine under the scene's directional light
  // instead of reading as a flat, dark silhouette.
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfa050,
    roughness: 0.35,
    metalness: 0.9,
  })

  // The panels use the grid texture built above as both their surface
  // pattern (map) and as a faint emissive glow (emissiveMap) - the
  // emissive color is what lets the grid lines read as if they're
  // faintly lit/catching light even on a panel's shadowed side,
  // instead of going completely black there like the old flat boxes
  // did. emissiveIntensity is kept low (0.35) so it's a subtle glow,
  // not a panel that looks like it's made of lightbulbs.
  const panelTexture = createSolarPanelTexture()
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c3f66,
    map: panelTexture,
    emissive: 0x1c3f66,
    emissiveMap: panelTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.3,
  })

  // ---- Arranging 6 satellites in a loose ring ------------------------------
  // The skills stop marker used to sit at (-10, 0, -170) (see
  // src/motion/scrollTimeline.js). The 6 satellites are spaced evenly
  // around that point on a circle - like a loose orbit - rather than
  // scattered by hand.
  //
  // The ring's radius grew from 6 to 8 in this redesign: the
  // satellites themselves got noticeably bigger (wider panels, bigger
  // body), so keeping the old, tighter spacing would have made them
  // overlap. Radius 8 makes the whole ring 16 units across and keeps
  // neighboring satellites (each roughly 6 units wide, wingtip to
  // wingtip, now) comfortably clear of touching each other.
  const center = { x: -10, y: 0, z: -170 }
  const radius = 8
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
