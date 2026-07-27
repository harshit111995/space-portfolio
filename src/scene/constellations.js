// ===================================================================
// CONSTELLATIONS.JS
// This file builds the 8 certificate constellations at the
// certificates stop - one small star-figure per issuer (Google,
// Cannes Lions, StackAdapt, CIM, Microsoft, Adelaide, Agentic/AdCP,
// and Other). Each is a handful of glowing stars joined by faint
// lines into a shape, the same way real constellations are drawn as
// dot-to-dot figures rather than random star clusters.
//
// The connecting LINES are the whole point of this file: without
// them, these would just look like more background stars. The lines
// are what say "these ones are deliberate, not scenery."
// ===================================================================

import * as THREE from 'three'

// ---- A soft glow sprite, drawn by hand -------------------------------
// Real bloom (light bleeding/glowing on screen) usually needs an
// expensive post-processing effect. Instead, this fakes a glow by
// drawing ONE small image - a bright white dot fading smoothly out to
// nothing - and stamping that image onto every star point instead of
// a plain flat dot. A radial gradient (a blend that spreads outward
// from a center point) is exactly what makes it look like a soft halo
// around a bright core, instead of a hard-edged circle.
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0, // inner circle: a single point at the center
    size / 2, size / 2, size / 2, // outer circle: the full edge of the image
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)') // solid bright core
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.6, 'rgba(190, 215, 255, 0.25)') // soft outer halo
  gradient.addColorStop(1, 'rgba(190, 215, 255, 0)') // fades to fully invisible

  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  return new THREE.CanvasTexture(canvas)
}

// ---- Building one constellation ---------------------------------------
// starCoords is a small list of [x, y, z] points in the constellation's
// OWN local space (roughly -3 to 3 in each direction) - these get
// turned into actual stars, and connections says which of those stars
// should be joined by a line (as a pair of indices into starCoords).
function createConstellation(starCoords, connections, glowTexture) {
  // A THREE.Group bundles the stars and lines together as one object,
  // so positioning/rotating the whole constellation only requires
  // touching the group - both parts move together automatically.
  const group = new THREE.Group()

  // ---- The stars themselves -------------------------------------------------
  const starPositions = new Float32Array(starCoords.length * 3)
  starCoords.forEach((point, i) => {
    starPositions[i * 3] = point[0]
    starPositions[i * 3 + 1] = point[1]
    starPositions[i * 3 + 2] = point[2]
  })

  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))

  const starMaterial = new THREE.PointsMaterial({
    // Much bigger than the background star field's size (1.4 - see
    // src/scene/stars.js) and using the glow texture below - between
    // the size and the glow, these need to be unmistakably different
    // from the plain background dots, not just slightly brighter.
    size: 2.2,
    sizeAttenuation: true,
    map: glowTexture,
    color: 0xbfe0ff,
    transparent: true,
    // AdditiveBlending makes overlapping bright pixels ADD together
    // (getting brighter) instead of one covering the other - this is
    // what makes the glow sprite actually look like emitted light
    // instead of a flat, painted-on circle.
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(starGeometry, starMaterial)
  group.add(points)

  // ---- The connecting lines -------------------------------------------------
  // THREE.LineSegments draws a separate line for every PAIR of
  // vertices in its position list - vertex 0 connects to vertex 1,
  // vertex 2 connects to vertex 3, and so on. It does NOT connect
  // everything in one continuous chain (that's a different class,
  // THREE.Line) - so for each requested connection, we push BOTH of
  // that connection's star positions in, one right after the other.
  const linePositions = []
  connections.forEach(([fromIndex, toIndex]) => {
    linePositions.push(...starCoords[fromIndex])
    linePositions.push(...starCoords[toIndex])
  })

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(linePositions), 3),
  )

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x9fc7ff,
    transparent: true,
    opacity: 0.45, // faint - the STARS should stand out, the lines just hint at the shape
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
  group.add(lines)

  return { group, points, lines }
}

// sceneApi is the object exported by scene.js - it bundles the actual
// THREE.Scene (sceneApi.scene) plus addUpdate(), which lets us hook
// into the single shared animation loop instead of starting our own.
export function createConstellations(scene) {
  const glowTexture = createGlowTexture()

  // ---- The 8 issuers, their stars, and how those stars connect -------------
  // These starting coordinates and connections are a sane, functional
  // layout, not a picture of anything in particular - nobody is trying
  // to make "Google" visually look like the word Google. Once this is
  // built and visible, individual local coordinates can be nudged by
  // eye if any figure looks cramped or ugly - that's expected polish,
  // not something to get exactly right up front.
  const issuers = [
    {
      name: 'Google',
      stars: [[0, 0, 0], [2, 1, 0], [3, -1, 0.5], [1, -2, 0], [-1, 1, 0.5], [4, 0.5, 0]],
      connections: [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5]],
    },
    {
      name: 'Cannes Lions',
      stars: [[0, 0, 0], [1.5, 2, 0], [3, 1, 0.5], [2, -1.5, 0], [-1, -1, 0]],
      connections: [[0, 1], [1, 2], [0, 3], [0, 4]],
    },
    {
      name: 'StackAdapt',
      stars: [[0, 0, 0], [2, 0, 0], [1, 2, 0.5], [3, 2, 0]],
      connections: [[0, 1], [1, 3], [0, 2], [2, 3]],
    },
    {
      name: 'CIM',
      stars: [[0, 0, 0], [2, 1, 0], [1, -2, 0.5], [-1.5, -1, 0], [3, -1, 0]],
      connections: [[0, 1], [0, 2], [0, 3], [1, 4]],
    },
    {
      name: 'Microsoft',
      stars: [[0, 0, 0], [2, 2, 0], [2, -2, 0.5], [4, 0, 0]],
      connections: [[0, 1], [0, 2], [1, 3], [2, 3]],
    },
    {
      name: 'Adelaide',
      stars: [[0, 0, 0], [1.5, 1.5, 0], [3, 0, 0.5], [1.5, -1.5, 0], [0, 0, 1]],
      connections: [[0, 1], [1, 2], [2, 3], [3, 0]],
    },
    {
      name: 'Agentic/AdCP',
      stars: [[0, 0, 0], [2, 1, 0], [4, 0, 0.5], [2, -1, 0], [1, 2, 0]],
      connections: [[0, 1], [1, 2], [1, 3], [1, 4]],
    },
    {
      name: 'Other',
      stars: [[0, 0, 0], [1, 2, 0], [2, 0, 0.5], [1, -2, 0], [3, 1, 0], [3, -1, 0]],
      connections: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [2, 5]],
    },
  ]

  // ---- Laying the 8 out across the field ------------------------------------
  // The certificates stop marker used to sit at (-10, 0, -110) (see
  // src/motion/scrollTimeline.js). The 8 constellations are arranged
  // in two rows of four around that point - column centers 10 units
  // apart (4 columns across 3 gaps = 30 units total, matching the
  // "~30 units wide" target) and rows 9 units apart - comfortably more
  // than each figure's own roughly 3-4 unit radius, so none of the 8
  // touch or overlap.
  const fieldCenter = { x: -10, y: 0, z: -110 }
  const columnOffsets = [-15, -5, 5, 15]
  const rowOffsets = [4.5, -4.5]

  const constellations = issuers.map((issuer, i) => {
    const column = i % 4
    const row = Math.floor(i / 4)

    // A little alternating depth offset (forward/back along z) keeps
    // the field from looking perfectly flat, the same trick used for
    // the asteroid cluster and satellite ring.
    const depthJitter = i % 2 === 0 ? 2 : -2

    const { group, points, lines } = createConstellation(issuer.stars, issuer.connections, glowTexture)
    group.position.set(
      fieldCenter.x + columnOffsets[column],
      fieldCenter.y + rowOffsets[row],
      fieldCenter.z + depthJitter,
    )
    scene.scene.add(group)

    return {
      name: issuer.name,
      group,
      points,
      lines,
      // Each constellation twinkles/drifts out of sync with the
      // others - a different phase offset per index means their
      // brightness pulses don't all rise and fall together.
      phase: i * 0.9,
      driftSpeed: 0.0001 + i * 0.00002,
    }
  })

  // ---- Twinkle + gentle drift, every frame ---------------------------------
  let time = 0
  scene.addUpdate(() => {
    time += 0.01

    for (const c of constellations) {
      // Twinkle: the stars' glow sprite opacity rises and falls
      // smoothly over time (a sine wave stays between -1 and 1
      // forever, which is why it's the standard tool for "gently pulse
      // back and forth" rather than "count upward forever"). Each
      // constellation's own phase offset keeps them from all pulsing
      // in perfect unison.
      c.points.material.opacity = 0.75 + Math.sin(time + c.phase) * 0.25
      c.lines.material.opacity = 0.35 + Math.sin(time * 0.8 + c.phase) * 0.15

      // Drift: a very slow rotation of the whole figure - subtle
      // enough to feel alive without looking like it's spinning.
      c.group.rotation.y += c.driftSpeed
    }
  })

  return constellations.map((c) => c.group)
}
