/**
 * SceneCache - LRU cache for loaded GLB scenes
 */

export class SceneCache {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.cache = new Map(); // sceneId -> { gltf, lastAccess }
  }

  /**
   * Get a scene from cache or load it
   * @param {string|number} sceneId - Scene identifier
   * @param {Function} loadFn - Async function to load the scene if not cached
   * @returns {Promise<Object>} - The loaded GLTF object
   */
  async get(sceneId, loadFn) {
    const key = String(sceneId);

    // Check if cached
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      entry.lastAccess = Date.now();
      return entry.gltf;
    }

    // Load the scene
    const gltf = await loadFn();

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Cache the result
    this.cache.set(key, {
      gltf,
      lastAccess: Date.now()
    });

    return gltf;
  }

  /**
   * Evict the least recently used entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      const entry = this.cache.get(oldestKey);

      // Dispose of the scene resources
      if (entry && entry.gltf && entry.gltf.scene) {
        this.disposeScene(entry.gltf.scene);
      }

      this.cache.delete(oldestKey);
    }
  }

  /**
   * Dispose of a scene's resources
   * @param {THREE.Object3D} scene - Scene to dispose
   */
  disposeScene(scene) {
    scene.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });
  }

  /**
   * Dispose of a material and its textures
   * @param {THREE.Material} material - Material to dispose
   */
  disposeMaterial(material) {
    // Dispose textures
    const textureProperties = [
      'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
      'envMap', 'alphaMap', 'aoMap', 'displacementMap',
      'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'
    ];

    for (const prop of textureProperties) {
      if (material[prop]) {
        material[prop].dispose();
      }
    }

    material.dispose();
  }

  /**
   * Check if a scene is cached
   * @param {string|number} sceneId - Scene identifier
   * @returns {boolean}
   */
  has(sceneId) {
    return this.cache.has(String(sceneId));
  }

  /**
   * Clear the entire cache
   */
  clear() {
    for (const entry of this.cache.values()) {
      if (entry.gltf && entry.gltf.scene) {
        this.disposeScene(entry.gltf.scene);
      }
    }
    this.cache.clear();
  }

  /**
   * Get the number of cached scenes
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}
