// This is the JavaScript entry point that index.html loads.
// It loads our stylesheet (dark background + section layout) and then
// starts up the 3D scene that lives on the <canvas id="webgl">
// sitting behind the page content.
import './styles/base.css'
import './scene/scene.js'

// Importing scene.js above runs its setup code right away: it builds
// the 3D scene, camera, lights, and a temporary test sphere, then
// starts the animation loop that draws it every frame. Nothing else
// needs to happen here yet.
