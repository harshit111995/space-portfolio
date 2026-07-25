// ===================================================================
// CURSOR.JS
// This file adds "click and drag to look around" - like turning your
// head to glance around a cockpit, then facing forward again when you
// let go.
//
// IMPORTANT: this only ever changes which way the camera is POINTING
// (its rotation). It never touches the camera's POSITION - the
// scroll timeline (src/motion/scrollTimeline.js) is the only thing
// allowed to move the camera along its path. Keeping those two
// completely separate is what stops drag-to-look from ever fighting
// with or breaking the scroll animation.
// ===================================================================

import sceneApi from '../scene/scene.js'

export function initDragLook(camera) {
  const canvas = document.querySelector('#webgl')

  // Allow vertical swipes to still scroll the page on touch devices.
  // Without this, the browser might assume ANY drag on the canvas
  // (including a simple up/down swipe meant for scrolling) belongs to
  // us instead, and users on phones would get stuck unable to scroll.
  canvas.style.touchAction = 'pan-y'

  // ---- Look-offset state -------------------------------------------------
  // "target" is where the look should end up, based on how far the
  // mouse has been dragged. "current" is where the look actually is
  // right now - it slowly catches up to the target every frame
  // (further down), which is what makes the motion feel smooth and
  // springy instead of snapping instantly.
  let targetOffsetX = 0
  let targetOffsetY = 0
  let currentOffsetX = 0
  let currentOffsetY = 0

  let isDragging = false
  let lastPointerX = 0
  let lastPointerY = 0

  // The farthest the look can turn, in radians, in any direction.
  // (0.15 radians is about 8.5 degrees - just a small glance, not a
  // full turn.) This is what stops someone from dragging the camera
  // all the way around.
  const maxOffset = 0.15

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  // ---- Listening for the drag ---------------------------------------------
  // Note: these are attached to the whole window, not just the
  // canvas. The canvas sits BEHIND the page content (#app), and that
  // content covers the entire screen, so clicks normally land on the
  // text/sections first, not the canvas underneath. Listening on the
  // window instead means dragging works anywhere on the page, which
  // is what "click and drag on the scene" needs to actually do.
  window.addEventListener('pointerdown', (event) => {
    isDragging = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
  })

  window.addEventListener('pointermove', (event) => {
    if (!isDragging) return

    // How far the pointer moved since the last time we checked.
    const deltaX = event.clientX - lastPointerX
    const deltaY = event.clientY - lastPointerY
    lastPointerX = event.clientX
    lastPointerY = event.clientY

    // Turn that pixel movement into a small rotation amount and add
    // it to the target, clamped so it can never exceed the max look
    // angle in either direction.
    targetOffsetX = clamp(targetOffsetX + deltaX * 0.002, -maxOffset, maxOffset)
    targetOffsetY = clamp(targetOffsetY + deltaY * 0.002, -maxOffset, maxOffset)
  })

  window.addEventListener('pointerup', () => {
    isDragging = false
    // Setting the TARGET back to zero here is what makes it spring
    // back to center - the damping below will smoothly ease the
    // current offset down to 0 over the next several frames, rather
    // than jumping straight back.
    targetOffsetX = 0
    targetOffsetY = 0
  })

  // ---- Applying the look, every frame -------------------------------------
  sceneApi.addUpdate(() => {
    const dampFactor = 0.06

    // Move the current offset a little closer to the target every
    // single frame (6% of the remaining distance), instead of
    // jumping straight there. This is what makes both dragging and
    // releasing feel smooth.
    currentOffsetX += (targetOffsetX - currentOffsetX) * dampFactor
    currentOffsetY += (targetOffsetY - currentOffsetY) * dampFactor

    // Add the offset on top of the camera's normal forward-facing
    // rotation (which is 0, since nothing else ever rotates the
    // camera). This only ever sets camera.ROTATION, never
    // camera.position - the scroll timeline owns position, and this
    // file never touches it.
    camera.rotation.y = -currentOffsetX
    camera.rotation.x = -currentOffsetY
  })
}
