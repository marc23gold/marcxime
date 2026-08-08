import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

/* Custom afterimage (motion-trail / persistence) effect for @react-three/
   postprocessing. postprocessing v6 removed its AfterimageEffect + FeedbackBuffer,
   so this reimplements the feedback loop on top of the v6 Effect API:

   - Each frame, "update" runs right before the effect's fullscreen pass.
     We ping-pong two render targets: the brightest of (current frame) vs
     (stored accumulation raised to `damping`) is written into the scratch
     target, then that becomes the new stored accumulation.
   - The effect's own fragment shader just draws the stored accumulation back
     onto the screen, so bright moving highlights leave soft, exponentially
     decaying trails while static content stays crisp.

   Exposed as <Afterimage damping={0.85} /> via wrapEffect. */

const FEEDBACK_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tNew;
  uniform sampler2D tOld;
  uniform float damping;
  varying vec2 vUv;
  void main() {
    vec3 current = texture2D(tNew, vUv).rgb;
    vec3 previous = texture2D(tOld, vUv).rgb;
    gl_FragColor = vec4(max(current, previous * damping), 1.0);
  }
`

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/* The effect's own pass simply redraws the freshest accumulation.
   postprocessing v6 requires effects to define mainImage/mainUv. */
const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tOld;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = texture2D(tOld, uv);
}
`

class AfterimageEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    opacity = 1,
    damping = 0.85,
  } = {}) {
    super('AfterimageEffect', FRAGMENT_SHADER, {
      blendFunction,
      opacity,
      uniforms: new Map([
        ['damping', new THREE.Uniform(damping)],
        ['tOld', new THREE.Uniform(null)],
      ]),
    })

    this._read = null
    this._write = null

    this._feedbackMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FEEDBACK_FRAGMENT_SHADER,
      uniforms: {
        tNew: { value: null },
        tOld: { value: null },
        damping: { value: damping },
      },
      depthTest: false,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this._feedbackMaterial,
    )
    mesh.frustumCulled = false

    this._scene = new THREE.Scene()
    this._scene.add(mesh)
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  initialize(renderer, alpha, frameBufferType) {
    super.initialize?.(renderer, alpha, frameBufferType)
    const { width, height } = renderer.getSize(new THREE.Vector2())
    this._read = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false })
    this._write = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false })
  }

  setSize(width, height) {
    if (this._read) this._read.setSize(width, height)
    if (this._write) this._write.setSize(width, height)
  }

  update(renderer, inputBuffer) {
    if (!this._read) return

    // Accumulate: write max(current, stored * damping) into the scratch target.
    this._feedbackMaterial.uniforms.tNew.value = inputBuffer.texture
    this._feedbackMaterial.uniforms.tOld.value = this._read.texture

    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this._write)
    renderer.render(this._scene, this._camera)
    renderer.setRenderTarget(previous)

    // Ping-pong: the freshly written target becomes next frame's stored frame.
    const swap = this._read
    this._read = this._write
    this._write = swap

    this.uniforms.get('tOld').value = this._read.texture
  }

  dispose() {
    if (this._read) {
      this._read.dispose()
      this._write.dispose()
      this._feedbackMaterial.dispose()
    }
  }
}

export const Afterimage = wrapEffect(AfterimageEffect)
