/**
 * SceneSmithViewer - Main 3D viewer component for SceneSmith scenes
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { OutlineEffect } from './OutlineEffect.js';
import { ObjectPicker } from './ObjectPicker.js';
import { IsolatedViewer } from './IsolatedViewer.js';
import { SceneCache } from './SceneCache.js';
import { MetadataManager } from './MetadataManager.js';
import { OverlayManager } from './OverlayManager.js';

export class SceneSmithViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      basePath: options.basePath || 'static/models/',
      isolatedContainer: options.isolatedContainer || null,
      onProgress: options.onProgress || null,
      onSelect: options.onSelect || null,
      onClearSelection: options.onClearSelection || null,
      outlineColor: options.outlineColor || '#e91e63',
      outlineThickness: options.outlineThickness || 4,
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.loadedScene = null;
    this.selectedObject = null;
    this.animationId = null;
    this.isInitialized = false;

    // Components
    this.outlineEffect = null;
    this.picker = null;
    this.isolatedViewer = null;
    this.cache = new SceneCache(10);
    this.loader = null;
    this.metadataManager = new MetadataManager(this.options.basePath);
    this.overlayManager = new OverlayManager();

    // Hidden objects tracking
    this.hiddenObjects = new Set();
    this.environmentMap = null;

    // Load ID counter and abort controller to guard against concurrent loads
    this._loadId = 0;
    this._abortController = null;

    // Drag detection: suppress click after orbit/pan
    this._pointerDownPos = null;
    this._isPointerDown = false;
    this._wasDragged = false;
    this._controlsEndTime = 0;

    // Bind methods
    this.handleClick = this.handleClick.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.animate = this.animate.bind(this);
  }

  /**
   * Initialize the viewer
   */
  init() {
    if (this.isInitialized) return;

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 450;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 2000);
    this.camera.position.set(5, 5, 5);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI * 0.95;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 500;
    this.controls.zoomSpeed = 1.2;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;

    // Add lights
    this.setupLights();

    // Create outline effect (lazy initialized on first selection)
    this.outlineEffect = null;

    // Create picker
    this.picker = new ObjectPicker(this.camera, this.renderer.domElement);

    // Create isolated viewer if container provided
    if (this.options.isolatedContainer) {
      this.isolatedViewer = new IsolatedViewer(this.options.isolatedContainer);
    }

    // Setup GLTFLoader with Draco and Meshopt decoders
    this.loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.loader.setDRACOLoader(dracoLoader);
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    // Drag detection: track pointer movement to distinguish clicks from drags
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      this._isPointerDown = true;
      this._wasDragged = false;
      // Stop auto-rotation and hide drag hint on first user interaction
      if (this.controls.autoRotate) {
        this.controls.autoRotate = false;
        this._hideDragHint();
      }
    });
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (this._isPointerDown && !this._wasDragged && this._pointerDownPos) {
        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        if (dx * dx + dy * dy > 25) {
          this._wasDragged = true;
        }
      }
    });
    window.addEventListener('pointerup', () => {
      this._isPointerDown = false;
    });
    this.controls.addEventListener('end', () => {
      if (this._wasDragged) {
        this._controlsEndTime = performance.now();
      }
    });

    // Stop auto-rotation on scroll/zoom too
    this.renderer.domElement.addEventListener('wheel', () => {
      if (this.controls.autoRotate) {
        this.controls.autoRotate = false;
        this._hideDragHint();
      }
    }, { passive: true });

    // Event listeners
    this.renderer.domElement.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);

    // Resize observer for container
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.isInitialized = true;

    // Create drag hint overlay
    this._dragHint = document.createElement('div');
    this._dragHint.className = 'drag-hint';
    this._dragHint.innerHTML = '<span class="drag-hint-icon">&#9995;</span> Drag to rotate';
    this.container.appendChild(this._dragHint);

    // Start animation loop
    this.animate();
  }

  /**
   * Setup scene lighting with environment map for realistic illumination
   */
  setupLights() {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Main directional light (key light)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);

    // Back/rim light for depth
    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 10, -15);
    this.scene.add(backLight);

    // Hemisphere light for natural environment feel
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
    this.scene.add(hemiLight);

    // Load environment map for reflections and ambient lighting
    this.loadEnvironmentMap();
  }

  /**
   * Load HDR environment map for realistic lighting
   */
  loadEnvironmentMap() {
    const rgbeLoader = new RGBELoader();
    // Use a neutral studio HDR for good lighting
    rgbeLoader.load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.environmentMap = texture;
        this.scene.environment = texture;
        // Don't set as background - keep the clean gray
      },
      undefined,
      (error) => {
        console.warn('Failed to load environment map, using fallback lighting:', error);
      }
    );
  }

  /**
   * Load a scene by path
   * @param {string} path - Path to the GLB file (relative to basePath)
   * @param {number|string} sceneId - Scene identifier for caching
   */
  async loadScene(path, sceneId) {
    if (!this.isInitialized) {
      this.init();
    }

    const loadId = ++this._loadId;

    // Abort any in-flight download so it doesn't compete for bandwidth
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();

    // Clear current scene
    this.clearScene();
    this.clearSelection();

    const fullPath = this.options.basePath + path;

    try {
      // Load GLB and metadata in parallel
      const [gltf] = await Promise.all([
        this.cache.get(sceneId, () =>
          this.loadGLTF(fullPath, loadId, this._abortController.signal)
        ),
        this.metadataManager.load(path).then(() => {
          const objectIds = this.metadataManager.getObjectIds();
          if (objectIds.size > 0) {
            this.picker.setKnownObjectIds(objectIds);
          }
        })
      ]);

      // If another loadScene() was called while we were loading, discard this result
      if (loadId !== this._loadId) {
        return;
      }

      // Clone the scene from cache
      this.loadedScene = gltf.scene.clone();

      // Setup materials for proper rendering
      this.loadedScene.traverse((child) => {
        if (child.isMesh) {
          // Clone materials to avoid modifying cached versions
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
          } else if (child.material) {
            child.material = child.material.clone();
          }

          // Enable shadows if needed
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(this.loadedScene);

      // Frame the scene
      this.resetCamera();

      // Re-enable auto-rotate for new scene and show drag hint
      this.controls.autoRotate = true;
      this._showDragHint();

      if (this.options.onProgress) {
        this.options.onProgress(100);
      }

    } catch (error) {
      // Re-throw AbortError so callers know the load was superseded
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('Failed to load scene:', error);
      throw error;
    }
  }

  /**
   * Load a GLTF file with progress tracking
   * @param {string} url - URL to load
   * @returns {Promise<Object>} - Loaded GLTF
   */
  async loadGLTF(url, loadId, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the body as a stream so we can report progress
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;

      if (this.options.onProgress && loadId === this._loadId) {
        if (total > 0) {
          const percent = Math.round((loaded / total) * 100);
          this.options.onProgress(percent);
        } else {
          // No Content-Length header — report -1 to signal indeterminate progress
          this.options.onProgress(-1);
        }
      }
    }

    // Combine chunks into a single ArrayBuffer
    const buffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Parse the GLB buffer with GLTFLoader
    return new Promise((resolve, reject) => {
      this.loader.parse(buffer.buffer, '', resolve, reject);
    });
  }

  /**
   * Clear the current scene
   */
  clearScene() {
    if (this.loadedScene) {
      // Dispose cloned materials
      this.loadedScene.traverse((child) => {
        if (child.isMesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });

      this.scene.remove(this.loadedScene);
      this.loadedScene = null;
    }

    // Clear hidden objects tracking
    this.hiddenObjects.clear();
    if (this.options.onShowAll) {
      this.options.onShowAll();
    }

    // Clear metadata and overlays
    this.metadataManager.clear();
    this.picker.setKnownObjectIds(null);
    if (this.isolatedViewer && this.isolatedViewer.scene) {
      this.overlayManager.clearAll(this.isolatedViewer.scene);
    }
  }

  /**
   * Handle click events for object selection
   */
  handleClick(event) {
    if (!this.loadedScene) return;

    // Ignore clicks that followed a drag (camera orbit/pan)
    if (this._wasDragged) return;
    if (performance.now() - this._controlsEndTime < 100) return;

    const result = this.picker.pick(event, this.loadedScene);

    if (result) {
      this.selectObject(result.object);
    } else {
      this.clearSelection();
    }
  }

  /**
   * Select an object
   * @param {THREE.Object3D} object - Object to select
   */
  selectObject(object) {
    // Clear previous selection
    if (this.selectedObject === object) return;

    this.selectedObject = object;

    // Initialize outline effect if needed
    if (!this.outlineEffect) {
      this.outlineEffect = new OutlineEffect({
        color: this.options.outlineColor,
        thickness: this.options.outlineThickness,
      });
    }

    // Update outline effect
    this.outlineEffect.setSelection(object);

    // Clear overlays before showing new object
    if (this.isolatedViewer && this.isolatedViewer.scene) {
      this.overlayManager.clearAll(this.isolatedViewer.scene);
    }

    // Show in isolated viewer
    if (this.isolatedViewer) {
      this.isolatedViewer.showObject(object);
    }

    // Callback with metadata
    if (this.options.onSelect) {
      const name = this.picker.getObjectName(object);
      const meta = this.metadataManager.getObjectMetadata(object.name);
      this.options.onSelect(object, name, meta);
    }
  }

  /**
   * Clear the current selection
   */
  clearSelection() {
    this.selectedObject = null;

    if (this.outlineEffect) {
      this.outlineEffect.clearSelection();
    }

    // Clear overlays before clearing isolated viewer
    if (this.isolatedViewer && this.isolatedViewer.scene) {
      this.overlayManager.clearAll(this.isolatedViewer.scene);
    }

    if (this.isolatedViewer) {
      this.isolatedViewer.clear();
    }

    if (this.options.onClearSelection) {
      this.options.onClearSelection();
    }
  }

  /**
   * Hide the currently selected object
   */
  hideSelected() {
    if (!this.selectedObject) return;

    const objectToHide = this.selectedObject;
    objectToHide.visible = false;
    this.hiddenObjects.add(objectToHide);

    // Clear the selection after hiding
    this.clearSelection();

    // Callback for UI update
    if (this.options.onHide) {
      this.options.onHide(this.hiddenObjects.size);
    }
  }

  /**
   * Show all hidden objects
   */
  showAll() {
    this.hiddenObjects.forEach(obj => {
      obj.visible = true;
    });
    this.hiddenObjects.clear();

    // Callback for UI update
    if (this.options.onShowAll) {
      this.options.onShowAll();
    }
  }

  /**
   * Get the number of hidden objects
   */
  getHiddenCount() {
    return this.hiddenObjects.size;
  }

  /**
   * Toggle collision overlay in the isolated viewer
   * @param {string} objectId - Object ID for collision file lookup
   * @returns {Promise<boolean>} - Whether collision is now visible
   */
  async toggleCollision(objectId) {
    if (!this.isolatedViewer || !this.isolatedViewer.scene) return false;

    if (this.overlayManager.collisionVisible) {
      this.overlayManager.hideCollision(this.isolatedViewer.scene);
      this.isolatedViewer.setVisualVisible(true);
      return false;
    }

    const collisionPath = this.metadataManager.getCollisionPath(objectId);
    if (!collisionPath) return false;

    await this.overlayManager.showCollision(
      collisionPath,
      this.isolatedViewer.scene,
      this.isolatedViewer.objectTransform,
      this.isolatedViewer.currentObject
    );
    this.isolatedViewer.setVisualVisible(false);
    return true;
  }

  /**
   * Toggle inertia overlay in the isolated viewer
   * @param {Object} physics - Physics metadata with links
   * @returns {boolean} - Whether inertia is now visible
   */
  toggleInertia(physics) {
    if (!this.isolatedViewer || !this.isolatedViewer.currentObject) return false;

    if (this.overlayManager.inertiaVisible) {
      this.overlayManager.hideInertia();
      return false;
    }

    if (!physics) return false;

    this.overlayManager.showInertia(
      physics,
      this.isolatedViewer.currentObject
    );
    return true;
  }

  /**
   * Apply joint transform in the isolated viewer
   * @param {Object} jointData
   * @param {number} value
   */
  applyJointTransform(jointData, value) {
    if (this.isolatedViewer) {
      this.isolatedViewer.applyJointTransform(jointData, value);
    }
  }

  /**
   * Frame the camera on the selected object
   * Maintains current viewing direction, just adjusts distance and target
   */
  frameSelected() {
    if (!this.selectedObject) return;

    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 2.5;

    // Get current camera direction (from target to camera)
    const currentDirection = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();

    // If camera direction is nearly zero (camera at target), use default direction
    if (currentDirection.length() < 0.001) {
      currentDirection.set(0.7, 0.5, 0.7).normalize();
    }

    // Position camera at the calculated distance along current viewing direction
    const targetPosition = new THREE.Vector3()
      .copy(center)
      .addScaledVector(currentDirection, distance);

    this.camera.position.copy(targetPosition);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Reset camera to frame the scene
   */
  resetCamera() {
    if (!this.loadedScene) return;

    const box = new THREE.Box3().setFromObject(this.loadedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

    // Position camera diagonally above the scene
    this.camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    );

    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Handle window/container resize
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
   * Handle keyboard shortcuts
   */
  handleKeyDown(event) {
    // Only handle if viewer is relevant: container focused, body focused, or has selection
    if (!this.container.contains(document.activeElement) &&
        document.activeElement !== document.body &&
        !this.selectedObject) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'r':
        this.resetCamera();
        break;
      case 'f':
        this.frameSelected();
        break;
      case 'h':
        this.hideSelected();
        break;
      case 'c':
        this.clearSelection();
        break;
      case 's':
        this.showAll();
        break;
    }
  }

  _showDragHint() {
    if (!this._dragHint) return;
    this._dragHint.classList.remove('is-fading');
    // Small delay so the scene is visible first
    setTimeout(() => {
      if (this._dragHint) this._dragHint.classList.add('is-visible');
    }, 800);
  }

  _hideDragHint() {
    if (!this._dragHint || !this._dragHint.classList.contains('is-visible')) return;
    this._dragHint.classList.add('is-fading');
    this._dragHint.classList.remove('is-visible');
  }

  /**
   * Animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(this.animate);

    this.controls.update();

    // Render main scene
    this.renderer.render(this.scene, this.camera);

    // Render outline effect on top
    if (this.outlineEffect && this.selectedObject) {
      this.outlineEffect.render(this.renderer, this.scene, this.camera);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.clearScene();
    this.clearSelection();

    // Remove event listeners
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('click', this.handleClick);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Dispose components
    if (this.outlineEffect) {
      this.outlineEffect.dispose();
    }

    if (this.isolatedViewer) {
      this.isolatedViewer.dispose();
    }

    if (this.picker) {
      this.picker.dispose();
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

    this.cache.clear();

    this.isInitialized = false;
  }
}
