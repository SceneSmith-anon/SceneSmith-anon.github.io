/**
 * OutlineEffect - Multi-pass outline effect for selected objects.
 * Produces clean outlines similar to Blender's selection highlighting.
 *
 * Pipeline:
 *   1. Render selected object silhouette to a mask texture (via layers)
 *   2. Dilate the mask N times (one pass per pixel of thickness)
 *   3. Composite: dilated - original = outline ring
 *
 * Uses only 4-neighbor reads per pass for AMD/ANGLE driver compatibility.
 */

import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const OUTLINE_LAYER = 1;

/**
 * Dilation shader: grows mask by 1 pixel per pass.
 * Reads center + 4 cardinal neighbors (5 texture reads total).
 */
class DilateMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        source: { value: null },
        texelSize: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform sampler2D source;
        uniform vec2 texelSize;

        void main() {
          float center = texture2D(source, vUv).r;
          float right  = texture2D(source, vUv + vec2(texelSize.x, 0.0)).r;
          float left   = texture2D(source, vUv - vec2(texelSize.x, 0.0)).r;
          float up     = texture2D(source, vUv + vec2(0.0, texelSize.y)).r;
          float down   = texture2D(source, vUv - vec2(0.0, texelSize.y)).r;

          float val = max(center, max(right, max(left, max(up, down))));
          gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
        }
      `,
    });
  }
}

/**
 * Composite shader: draws outline where dilated mask exists but original doesn't.
 */
class CompositeOutlineMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        dilated: { value: null },
        original: { value: null },
        color: { value: new THREE.Color() },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform sampler2D dilated;
        uniform sampler2D original;
        uniform vec3 color;

        void main() {
          float d = texture2D(dilated, vUv).r;
          float o = texture2D(original, vUv).r;

          // Outline = dilated region minus original object
          float outline = step(0.5, d) * (1.0 - step(0.5, o));

          gl_FragColor = vec4(color, 1.0) * outline;
        }
      `,
    });
  }
}

// --- Main OutlineEffect Class ---

export class OutlineEffect {
  constructor(options = {}) {
    // Thickness in CSS pixels (scaled by device pixel ratio at render time)
    this.thickness = options.thickness || 3;
    this.color = new THREE.Color(options.color || '#e91e63');

    this.selectedObject = null;
    this._width = 0;
    this._height = 0;

    // White material for rendering the object silhouette
    this.maskMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    // Original mask render target
    this.maskTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    // Ping-pong targets for dilation
    this.dilateA = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.dilateB = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    // Materials and quads
    this.dilateMaterial = new DilateMaterial();
    this.dilateQuad = new FullScreenQuad(this.dilateMaterial);

    this.compositeMaterial = new CompositeOutlineMaterial();
    this.compositeQuad = new FullScreenQuad(this.compositeMaterial);
  }

  /**
   * Mark an object for outlining (enables OUTLINE_LAYER on its meshes).
   */
  setSelection(object) {
    this.clearSelection();
    if (!object) return;

    this.selectedObject = object;
    object.traverse((child) => {
      if (child.isMesh) {
        child.layers.enable(OUTLINE_LAYER);
      }
    });
  }

  /**
   * Remove outline from the current object.
   */
  clearSelection() {
    if (this.selectedObject) {
      this.selectedObject.traverse((child) => {
        if (child.isMesh) {
          child.layers.disable(OUTLINE_LAYER);
        }
      });
    }
    this.selectedObject = null;
  }

  /**
   * Resize render targets to match the renderer's physical pixel size.
   */
  _updateSize(renderer) {
    const size = renderer.getSize(new THREE.Vector2());
    const dpr = renderer.getPixelRatio();
    const w = Math.floor(size.x * dpr);
    const h = Math.floor(size.y * dpr);

    if (w !== this._width || h !== this._height) {
      this._width = w;
      this._height = h;
      this.maskTarget.setSize(w, h);
      this.dilateA.setSize(w, h);
      this.dilateB.setSize(w, h);
    }
  }

  /**
   * Render the outline effect. Call AFTER rendering the main scene.
   */
  render(renderer, scene, camera) {
    if (!this.selectedObject || !this.selectedObject.visible) return;

    this._updateSize(renderer);

    const physicalThickness = Math.max(1, Math.round(this.thickness * renderer.getPixelRatio()));
    const texelX = 1.0 / this._width;
    const texelY = 1.0 / this._height;

    // Save state
    const savedAutoClear = renderer.autoClear;
    const savedClearColor = renderer.getClearColor(new THREE.Color());
    const savedClearAlpha = renderer.getClearAlpha();
    const savedLayersMask = camera.layers.mask;
    const savedBackground = scene.background;
    const savedEnvironment = scene.environment;

    try {
      // ---- Step 1: Render mask of selected object ----
      camera.layers.set(OUTLINE_LAYER);
      scene.overrideMaterial = this.maskMaterial;
      scene.background = null;  // Prevent background from filling mask
      scene.environment = null;
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(this.maskTarget);
      renderer.clear();
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
      scene.background = savedBackground;
      scene.environment = savedEnvironment;
      camera.layers.mask = savedLayersMask;

      // ---- Step 2: Dilate mask N times (ping-pong) ----
      this.dilateMaterial.uniforms.texelSize.value.set(texelX, texelY);

      let readTarget = this.maskTarget;
      let writeTarget = this.dilateA;

      for (let i = 0; i < physicalThickness; i++) {
        this.dilateMaterial.uniforms.source.value = readTarget.texture;
        renderer.setRenderTarget(writeTarget);
        renderer.clear();
        this.dilateQuad.render(renderer);

        // Swap for next iteration
        if (i === 0) {
          readTarget = this.dilateA;
          writeTarget = this.dilateB;
        } else {
          const tmp = readTarget;
          readTarget = writeTarget;
          writeTarget = tmp;
        }
      }

      // readTarget now has the final dilated mask
      renderer.setRenderTarget(null);

      // ---- Step 3: Composite outline over scene ----
      renderer.autoClear = false;
      this.compositeMaterial.uniforms.dilated.value = readTarget.texture;
      this.compositeMaterial.uniforms.original.value = this.maskTarget.texture;
      this.compositeMaterial.uniforms.color.value.copy(this.color);
      this.compositeQuad.render(renderer);

    } finally {
      // Restore all renderer state
      renderer.autoClear = savedAutoClear;
      renderer.setClearColor(savedClearColor, savedClearAlpha);
      camera.layers.mask = savedLayersMask;
      scene.overrideMaterial = null;
      scene.background = savedBackground;
      scene.environment = savedEnvironment;
      renderer.setRenderTarget(null);
    }
  }

  /** No-op for API compatibility */
  update() {}

  /** Update outline color */
  setColor(color) {
    this.color.set(color);
  }

  /** Dispose of all GPU resources */
  dispose() {
    this.clearSelection();
    this.maskTarget.dispose();
    this.dilateA.dispose();
    this.dilateB.dispose();
    this.dilateMaterial.dispose();
    this.dilateQuad.dispose();
    this.compositeMaterial.dispose();
    this.compositeQuad.dispose();
    this.maskMaterial.dispose();
  }
}
