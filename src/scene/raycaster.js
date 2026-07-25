// ===================================================================
// RAYCASTER.JS
// This file detects when the mouse is hovering over one of the 3D
// planets. When it is, it shows a matching HTML "panel" (an info
// card, for example) and changes the cursor to a pointer, like
// hovering over a normal clickable link.
// ===================================================================

import * as THREE from 'three'
import sceneApi from './scene.js'

// ---- The list of hoverable objects -----------------------------------
// Each entry pairs one 3D mesh (like the Mars mesh) with the id of the
// HTML element that should light up when the mouse hovers over it.
const targets = []

// Other files call this to say "this mesh should be hoverable, and
// when the mouse is over it, show the HTML element with this id."
export function registerTarget(mesh, panelId) {
  targets.push({ mesh, panelId })
}

// ---- Tracking the mouse position ------------------------------------
// A Vector2 holding the mouse position "normalized" to a -1 to 1
// range, with (0,0) at the center of the screen - this is the exact
// format THREE.Raycaster expects.
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

// A Raycaster shoots an invisible, straight line ("ray") from the
// camera through the mouse's position and out into the 3D scene, and
// can tell us which objects that line runs into - like a laser
// pointer coming out of the mouse cursor.
const raycaster = new THREE.Raycaster()

// Shows the panel for whichever target was hit (if any), and hides
// every other registered panel, so only one panel is ever showing at
// a time.
function showPanelFor(hitTarget) {
  for (const target of targets) {
    // The matching HTML element might not exist on the page yet, so
    // we check for it before trying to change its classes.
    const panelEl = document.getElementById(target.panelId)
    if (!panelEl) continue

    if (target === hitTarget) {
      panelEl.classList.add('is-visible')
    } else {
      panelEl.classList.remove('is-visible')
    }
  }
}

export function initRaycaster(camera) {
  // Checking what the mouse is pointing at is a bit of work for the
  // browser to do. Doing it on every single animation frame (up to
  // ~60 times a second) is more often than we actually need, so
  // instead we track when it last ran and skip frames until at least
  // 50 milliseconds have passed.
  const throttleMs = 50
  let lastRunTime = 0

  sceneApi.addUpdate(() => {
    const now = performance.now()
    if (now - lastRunTime < throttleMs) {
      return // Not enough time has passed yet - skip this frame.
    }
    lastRunTime = now

    // Aim the ray from the camera, through the current mouse
    // position, into the scene.
    raycaster.setFromCamera(mouse, camera)

    // Only check against our registered planet meshes - not
    // everything in the scene (stars, the moon, etc.) - since that's
    // both faster and all we actually care about here.
    // The "false" here means "don't also check child objects" - Earth
    // has its cloud layer as a child, and without this, hovering
    // Earth would hit the clouds instead and never match our
    // registered Earth target.
    const meshes = targets.map((target) => target.mesh)
    const hits = raycaster.intersectObjects(meshes, false)

    if (hits.length > 0) {
      // The ray hit something. hits[0] is the closest object hit.
      const hitTarget = targets.find((target) => target.mesh === hits[0].object)
      showPanelFor(hitTarget)
      document.body.style.cursor = 'pointer'
    } else {
      // The ray hit nothing - hide every panel and use the normal cursor.
      showPanelFor(null)
      document.body.style.cursor = 'default'
    }
  })
}
