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
    this.objectTransform = null; // Stored centering/scaling transform for overlays
    this.originalTransforms = new Map(); // For joint animation reset
    this._nodeCache = new Map(); // Cache child node lookups by name
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

    // Store the transform so overlays can match it
    this.objectTransform = {
      position: this.currentObject.position.clone(),
      scale: this.currentObject.scale.clone(),
      quaternion: this.currentObject.quaternion.clone(),
    };

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

    this.objectTransform = null;
    this.originalTransforms.clear();
    this._nodeCache.clear();
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
   * Show or hide the visual mesh
   */
  setVisualVisible(visible) {
    if (!this.currentObject) return;
    this.currentObject.visible = visible;
  }

  /**
   * Find all child nodes belonging to a given link name.
   *
   * THREE.js GLTFLoader sanitizes node names by stripping "/" and "." characters.
   * GLB names like "credenza_1/E_door_1_1.001" become "credenza_1E_door_1_1001".
   * A single link may span multiple mesh nodes that all need to be transformed together.
   *
   * Results are cached in _nodeCache.
   * @param {string} childName - The expected child link name (e.g. "E_door_1_1")
   * @returns {THREE.Object3D[]|null} - Array of matching nodes, or null if none found
   */
  _findChildNodes(childName) {
    if (this._nodeCache.has(childName)) {
      return this._nodeCache.get(childName);
    }

    if (!this.currentObject) return null;

    // Build the sanitized prefix that GLTFLoader produces:
    // "credenza_1" + "E_door_1_1" = "credenza_1E_door_1_1"
    const objectId = this.currentObject.name || '';
    const sanitizedPrefix = objectId + childName;

    const matched = [];
    const allNames = [];

    this.currentObject.traverse((node) => {
      if (node === this.currentObject) return;
      if (node.name) allNames.push(node.name);

      // Exact match on sanitized name, or sanitized name followed by
      // a Blender numeric suffix (digits only, since "." is also stripped)
      if (node.name === sanitizedPrefix || node.name === childName) {
        matched.push(node);
      } else if (node.name.length > sanitizedPrefix.length &&
                 node.name.startsWith(sanitizedPrefix) &&
                 /^\d+$/.test(node.name.slice(sanitizedPrefix.length))) {
        matched.push(node);
      }
    });

    if (matched.length === 0) {
      console.warn(
        `[IsolatedViewer] Could not find child nodes for link "${childName}" (prefix "${sanitizedPrefix}"). Available:`,
        allNames.filter(n => n.length > 0)
      );
      this._nodeCache.set(childName, null);
      return null;
    }

    this._nodeCache.set(childName, matched);
    return matched;
  }

  /**
   * Apply a joint transform to the child link in the current object.
   * A single link may consist of multiple mesh nodes (Blender .NNN suffixes),
   * so all matching nodes are transformed together.
   * @param {Object} jointData - Joint metadata { type, child_link, axis, pose }
   * @param {number} value - The joint value (radians for revolute, meters for prismatic)
   */
  applyJointTransform(jointData, value) {
    if (!this.currentObject) return;

    const childName = jointData.child_link;
    const childNodes = this._findChildNodes(childName);
    if (!childNodes) return;

    // Metadata uses Z-up (SDF/URDF convention), GLTF/THREE.js uses Y-up.
    // Convert: (x, y, z)_zup → (x, z, -y)_yup
    const axis = new THREE.Vector3(
      jointData.axis[0],
      jointData.axis[2],
      -jointData.axis[1]
    ).normalize();

    const pivot = new THREE.Vector3(
      jointData.pose[0],
      jointData.pose[2],
      -jointData.pose[1]
    );

    // If pose has non-zero orientation (roll/pitch/yaw), rotate the axis accordingly
    if (jointData.pose.length >= 6) {
      const roll = jointData.pose[3];
      const pitch = jointData.pose[4];
      const yaw = jointData.pose[5];
      if (roll !== 0 || pitch !== 0 || yaw !== 0) {
        // Convert Euler angles from Z-up to Y-up as well
        const poseQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(roll, yaw, -pitch, 'XYZ')
        );
        axis.applyQuaternion(poseQuat).normalize();
      }
    }

    for (const childNode of childNodes) {
      const cacheKey = childNode.name;

      // Store original transform on first use
      if (!this.originalTransforms.has(cacheKey)) {
        this.originalTransforms.set(cacheKey, {
          position: childNode.position.clone(),
          quaternion: childNode.quaternion.clone(),
        });
      }

      const original = this.originalTransforms.get(cacheKey);

      if (jointData.type === 'revolute') {
        // Reset to original
        childNode.position.copy(original.position);
        childNode.quaternion.copy(original.quaternion);

        // Rotate around joint axis at the pivot point
        const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, value);

        // Offset from pivot, rotate, translate back
        const offset = new THREE.Vector3().copy(childNode.position).sub(pivot);
        offset.applyQuaternion(rotQuat);

        childNode.position.copy(pivot).add(offset);
        childNode.quaternion.premultiply(rotQuat);

      } else if (jointData.type === 'prismatic') {
        childNode.position.copy(original.position);
        childNode.quaternion.copy(original.quaternion);

        const translation = axis.clone().multiplyScalar(value);
        childNode.position.add(translation);
      }
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
