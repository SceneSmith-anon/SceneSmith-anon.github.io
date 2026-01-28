/**
 * Jump Flood Algorithm (JFA) for SDF outline effects
 * Adapted from https://github.com/gkjohnson/three-jumpflood-demo
 */

import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Expand mask material - expands the mask by 1 pixel in each direction
class ExpandMaskMaterial extends THREE.ShaderMaterial {
  get source() {
    return this.uniforms.source.value;
  }

  set source(v) {
    this.uniforms.source.value = v;
  }

  constructor() {
    super({
      uniforms: {
        source: { value: null },
      },
      vertexShader: /* glsl */`
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D source;
        void main() {
          ivec2 currCoord = ivec2(gl_FragCoord.xy);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              if (x == 0 && y == 0) continue;
              ivec2 coord = currCoord + ivec2(x, y);
              float otherValue = texelFetch(source, coord, 0).r;
              if (otherValue != 0.0) {
                gl_FragColor = vec4(1.0);
                return;
              }
            }
          }
          gl_FragColor = vec4(0.0);
        }
      `,
    });
  }
}

// Seed material - writes fragment coordinates for JFA initialization
class SeedMaterial extends THREE.ShaderMaterial {
  get negative() {
    return this.uniforms.negative.value === -1;
  }

  set negative(v) {
    this.uniforms.negative.value = v ? -1 : 1;
  }

  constructor() {
    super({
      uniforms: {
        negative: { value: 1 },
      },
      vertexShader: /* glsl */`
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform int negative;
        void main() {
          gl_FragColor = vec4(gl_FragCoord.xy, 1e4 * float(negative), 1);
        }
      `,
    });
  }
}

// JFA material - performs jump flood iterations
class JFAMaterial extends THREE.ShaderMaterial {
  get source() {
    return this.uniforms.source.value;
  }

  set source(v) {
    this.uniforms.source.value = v;
  }

  get mask() {
    return this.uniforms.mask.value;
  }

  set mask(v) {
    this.uniforms.mask.value = v;
  }

  get step() {
    return this.uniforms.step.value;
  }

  set step(v) {
    this.uniforms.step.value = v;
  }

  constructor() {
    // Generate unrolled loop code for neighbor sampling
    const loopCode = [];
    for (let i = 0; i < 9; i++) {
      const x = (i % 3) - 1;
      const y = Math.floor(i / 3) - 1;
      if (x === 0 && y === 0) continue;

      loopCode.push(/* glsl */`
        otherCoord = currCoord + ivec2(${x}, ${y}) * step;
        if (otherCoord.x < size.x && otherCoord.x >= 0 &&
            otherCoord.y < size.y && otherCoord.y >= 0) {
          other = texelFetch(source, otherCoord, 0).rgb;
          if (other.b != 0.0) {
            if (resultSign != sign(other.z)) {
              float dist = length(vec2(currCoord - otherCoord));
              if (dist < result.z * resultSign) {
                result = vec3(otherCoord, dist * resultSign);
              }
            } else if (ivec2(other.rg) != otherCoord) {
              float dist = length(vec2(currCoord - ivec2(other.rg)));
              if (dist < result.z * resultSign) {
                result = vec3(other.rg, dist * resultSign);
              }
            }
          }
        }
      `);
    }

    super({
      uniforms: {
        source: { value: null },
        mask: { value: null },
        step: { value: 0 },
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
        uniform sampler2D mask;
        uniform int step;

        void main() {
          ivec2 size = textureSize(source, 0);
          ivec2 currCoord = ivec2(gl_FragCoord.xy);
          vec3 result = texelFetch(source, currCoord, 0).rgb;

          if (texture(mask, vUv).r < 0.5) {
            gl_FragColor = vec4(result, 1);
            discard;
          }

          float resultSign = sign(result.z);
          ivec2 otherCoord;
          vec3 other;

          ${loopCode.join('')}

          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });
  }
}

// Effect material - renders the final outline effect
class EffectMaterial extends THREE.ShaderMaterial {
  get time() {
    return this.uniforms.time.value;
  }

  set time(v) {
    this.uniforms.time.value = v;
  }

  get map() {
    return this.uniforms.map.value;
  }

  set map(v) {
    this.uniforms.map.value = v;
  }

  get mask() {
    return this.uniforms.mask.value;
  }

  set mask(v) {
    this.uniforms.mask.value = v;
  }

  get thickness() {
    return this.uniforms.thickness.value;
  }

  set thickness(v) {
    this.uniforms.thickness.value = v;
  }

  get mode() {
    return this.uniforms.mode.value;
  }

  set mode(v) {
    this.uniforms.mode.value = v;
  }

  get inside() {
    return this.uniforms.inside.value === -1;
  }

  set inside(v) {
    this.uniforms.inside.value = v ? -1 : 1;
  }

  get color() {
    return this.uniforms.color.value;
  }

  constructor() {
    super({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        map: { value: null },
        mask: { value: null },
        color: { value: new THREE.Color() },
        thickness: { value: 5 },
        inside: { value: 1 },
        mode: { value: 2 }, // Default to outline mode
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
        uniform float time;
        uniform sampler2D map;
        uniform sampler2D mask;
        uniform float thickness;
        uniform int mode;
        uniform int inside;
        uniform vec3 color;

        void main() {
          vec2 size = vec2(textureSize(map, 0));
          ivec2 currCoord = ivec2(vUv * size);
          vec3 s = texelFetch(map, currCoord, 0).rgb;

          if (s.b == 0.0) {
            discard;
          }

          // Outline mode (mode == 2)
          float dist = s.b * float(inside);
          float w = 0.5;
          float val = smoothstep(thickness + w, thickness - w, dist) *
                      smoothstep(-w - 1.0, w - 1.0, dist);

          gl_FragColor.rgb = color;
          gl_FragColor.a = clamp(val, 0.0, 1.0);

          if (gl_FragColor.a <= 0.0) {
            discard;
          }

          #include <colorspace_fragment>
        }
      `,
    });
  }
}

/**
 * JumpFloodEffect - Manages JFA-based outline rendering for selected objects
 */
export class JumpFloodEffect {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.thickness = options.thickness || 30;
    this.color = new THREE.Color(options.color || '#e91e63');
    this.inside = options.inside || false;

    this.selectedObject = null;
    this.originalMaterials = new Map();

    // Create render targets
    this.targets = [
      new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
    ];

    this.masks = [
      new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
      }),
      new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
      }),
    ];

    // Create materials
    this.maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.seedMaterial = new SeedMaterial();
    this.seedMaterial.side = THREE.DoubleSide;

    // Create quads for fullscreen passes
    this.effectQuad = new FullScreenQuad(new EffectMaterial());
    this.jfaQuad = new FullScreenQuad(new JFAMaterial());
    this.seedQuad = new FullScreenQuad(new SeedMaterial());
    this.expandQuad = new FullScreenQuad(new ExpandMaskMaterial());

    // Set color
    this.effectQuad.material.color.copy(this.color);

    // Temp objects for calculations
    this.box = new THREE.Box3();
    this.sphere = new THREE.Sphere();
  }

  setSize(width, height) {
    const dpr = this.renderer.getPixelRatio();
    this.targets[0].setSize(width * dpr, height * dpr);
    this.targets[1].setSize(width * dpr, height * dpr);
  }

  setSelection(object) {
    this.selectedObject = object;
  }

  clearSelection() {
    this.selectedObject = null;
  }

  setColor(color) {
    this.color.set(color);
    this.effectQuad.material.color.copy(this.color);
  }

  setThickness(thickness) {
    this.thickness = thickness;
  }

  render(scene, camera) {
    if (!this.selectedObject || !this.selectedObject.visible) {
      return;
    }

    const renderer = this.renderer;
    const { targets, masks, thickness } = this;

    // Store original state
    const originalAutoClear = renderer.autoClear;
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();

    // Calculate mask size based on thickness
    const maskWidth = Math.max(Math.floor(targets[0].width / thickness), 3);
    const maskHeight = Math.max(Math.floor(targets[0].height / thickness), 3);
    masks[0].setSize(maskWidth, maskHeight);
    masks[1].setSize(maskWidth, maskHeight);

    // Render mask of selected object
    const originalVisible = [];
    scene.traverse((obj) => {
      if (obj.isMesh || obj.isLine || obj.isPoints) {
        originalVisible.push({ obj, visible: obj.visible });
        obj.visible = false;
      }
    });

    // Make only selected object visible
    this.selectedObject.traverse((obj) => {
      if (obj.isMesh || obj.isLine || obj.isPoints) {
        obj.visible = true;
      }
    });

    scene.overrideMaterial = this.maskMaterial;
    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(masks[0]);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;

    // Restore visibility
    originalVisible.forEach(({ obj, visible }) => {
      obj.visible = visible;
    });

    // Expand mask
    for (let i = 0; i < 4; i++) {
      this.expandQuad.material.source = masks[0].texture;
      renderer.setRenderTarget(masks[1]);
      this.expandQuad.render(renderer);
      masks.reverse();
    }
    masks.reverse();

    // Calculate scissor region based on object bounding box
    camera.updateMatrixWorld();
    this.box.setFromObject(this.selectedObject).getBoundingSphere(this.sphere);

    const offset = this.sphere.center.clone();
    offset.applyMatrix4(camera.matrixWorldInverse);
    offset.x += this.sphere.radius;
    offset.y += this.sphere.radius;
    offset.applyMatrix4(camera.projectionMatrix);

    this.sphere.center.project(camera).multiplyScalar(0.5);
    this.sphere.center.x += 0.5;
    this.sphere.center.y += 0.5;
    this.sphere.center.z = 0;

    offset.multiplyScalar(0.5);
    offset.x += 0.5;
    offset.y += 0.5;
    offset.z = 0;

    let { width, height } = targets[0];
    width /= renderer.getPixelRatio();
    height /= renderer.getPixelRatio();

    const delta = Math.max(
      Math.abs(this.sphere.center.x - offset.x) * width,
      Math.abs(this.sphere.center.y - offset.y) * height
    ) + thickness;

    this.sphere.center.x *= width;
    this.sphere.center.y *= height;

    const { x, y } = this.sphere.center;
    renderer.setScissorTest(true);
    renderer.setScissor(x - delta, y - delta, delta * 2, delta * 2);

    // Initialize JFA seed
    renderer.setRenderTarget(targets[0]);
    this.seedQuad.material.depthWrite = false;
    this.seedQuad.render(renderer);

    // Render selected object to seed
    this.selectedObject.traverse((obj) => {
      if (obj.isMesh || obj.isLine || obj.isPoints) {
        obj.visible = true;
      }
    });

    scene.overrideMaterial = this.seedMaterial;
    this.seedMaterial.negative = true;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = true;
    scene.overrideMaterial = null;

    // Restore visibility again
    originalVisible.forEach(({ obj, visible }) => {
      obj.visible = visible;
    });

    renderer.setRenderTarget(null);

    // JFA ping-pong iterations
    let step = Math.min(Math.max(targets[0].width, targets[0].height), thickness);
    while (true) {
      this.jfaQuad.material.step = step;
      this.jfaQuad.material.source = targets[0].texture;
      this.jfaQuad.material.mask = masks[1].texture;

      renderer.setRenderTarget(targets[1]);
      this.jfaQuad.render(renderer);
      renderer.setRenderTarget(null);

      targets.reverse();

      if (step <= 1) break;
      step = Math.ceil(step * 0.5);
    }

    // Render final effect to screen
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    this.effectQuad.material.time = performance.now();
    this.effectQuad.material.map = targets[0].texture;
    this.effectQuad.material.mask = masks[1].texture;
    this.effectQuad.material.thickness = thickness;
    this.effectQuad.material.mode = 2; // Outline mode
    this.effectQuad.material.inside = this.inside;
    this.effectQuad.render(renderer);
    renderer.autoClear = originalAutoClear;

    renderer.setScissorTest(false);

    // Restore clear color
    renderer.setClearColor(originalClearColor, originalClearAlpha);
  }

  dispose() {
    this.targets.forEach(t => t.dispose());
    this.masks.forEach(m => m.dispose());
    this.maskMaterial.dispose();
    this.seedMaterial.dispose();
    this.effectQuad.material.dispose();
    this.effectQuad.dispose();
    this.jfaQuad.material.dispose();
    this.jfaQuad.dispose();
    this.seedQuad.material.dispose();
    this.seedQuad.dispose();
    this.expandQuad.material.dispose();
    this.expandQuad.dispose();
  }
}
