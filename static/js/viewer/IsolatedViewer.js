/**
 * IsolatedViewer - Side panel viewer for displaying selected objects in isolation
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class IsolatedViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      background: options.background || 0xf5f5f5,
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentObject = null;
    this.animationId = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the viewer (lazy initialization)
   */
  init() {
    if (this.isInitialized) return;

    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || 300;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.background);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100);
    this.camera.position.set(2, 1.5, 2);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 50;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-5, 5, -5);
    this.scene.add(backLight);

    // Load environment map for reflections
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
      }
    );

    // Handle resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.isInitialized = true;
  }

  /**
   * Handle container resize
   */
  handleResize() {
    if (!this.renderer || !this.camera) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Show an object in the isolated viewer
   * @param {THREE.Object3D} object - Object to display
   */
  showObject(object) {
    // Initialize if needed
    if (!this.isInitialized) {
      this.init();
    }

    // Clear previous object
    this.clear();

    // Clone the object
    this.currentObject = object.clone();

    // Handle materials - ensure they're properly cloned and reset any selection highlighting
    this.currentObject.traverse((child) => {
      if (child.isMesh) {
        // Clone materials to avoid modifying originals
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => {
            const cloned = m.clone();
            // Reset emissive to remove selection highlight
            if (cloned.emissive) {
              cloned.emissive.setHex(0x000000);
              cloned.emissiveIntensity = 0;
            }
            return cloned;
          });
        } else if (child.material) {
          child.material = child.material.clone();
          // Reset emissive to remove selection highlight
          if (child.material.emissive) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      }
    });

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(this.currentObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the object
    this.currentObject.position.sub(center);

    // Scale to fit
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim;
      this.currentObject.scale.multiplyScalar(scale);
    }

    this.scene.add(this.currentObject);

    // Frame the camera
    this.frameObject();

    // Start animation loop
    this.startAnimation();
  }

  /**
   * Frame the camera to fit the object
   */
  frameObject() {
    if (!this.currentObject) return;

    const box = new THREE.Box3().setFromObject(this.currentObject);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const fov = this.camera.fov * (Math.PI / 180);
    const distance = sphere.radius / Math.sin(fov / 2) * 1.2;

    this.camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
    this.controls.target.copy(sphere.center);
    this.controls.update();
  }

  /**
   * Clear the current object
   */
  clear() {
    if (this.currentObject) {
      // Dispose of cloned materials and geometries
      this.currentObject.traverse((child) => {
        if (child.isMesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });

      this.scene.remove(this.currentObject);
      this.currentObject = null;
    }

    this.stopAnimation();
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    if (this.animationId) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop the animation loop
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.stopAnimation();
    this.clear();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    this.isInitialized = false;
  }
}
