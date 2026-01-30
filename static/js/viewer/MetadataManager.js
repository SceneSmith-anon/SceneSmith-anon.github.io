/**
 * MetadataManager - Loads and caches scene metadata for object lookup
 */

export class MetadataManager {
  constructor(basePath = 'static/models/') {
    this.basePath = basePath;
    this.metadata = null;
    this.objectMap = new Map();
    this.currentScenePath = null;
  }

  /**
   * Load metadata for a scene
   * @param {string} scenePath - Scene path relative to basePath (e.g. "room/scene_100/scene_named.glb")
   * @returns {Promise<Object|null>} - The metadata object or null on failure
   */
  async load(scenePath) {
    // Derive metadata path from scene GLB path
    const sceneDir = scenePath.replace(/\/[^/]+\.glb$/, '');
    const metadataUrl = this.basePath + sceneDir + '/scene_metadata.json';

    this.clear();
    this.currentScenePath = sceneDir;

    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        console.warn(`Metadata not found: ${metadataUrl}`);
        return null;
      }
      this.metadata = await response.json();
      this._buildObjectMap();
      return this.metadata;
    } catch (err) {
      console.warn('Failed to load metadata:', err);
      return null;
    }
  }

  /**
   * Build a lookup map from object_id to object metadata
   */
  _buildObjectMap() {
    this.objectMap.clear();
    if (!this.metadata || !this.metadata.objects) return;

    for (const obj of this.metadata.objects) {
      if (obj.object_id) {
        this.objectMap.set(obj.object_id, obj);
      }
    }
  }

  /**
   * Get metadata for an object by its object_id
   * @param {string} objectId
   * @returns {Object|null}
   */
  getObjectMetadata(objectId) {
    return this.objectMap.get(objectId) || null;
  }

  /**
   * Get the set of all known object IDs
   * @returns {Set<string>}
   */
  getObjectIds() {
    return new Set(this.objectMap.keys());
  }

  /**
   * Get the collision GLB path for an object
   * @param {string} objectId
   * @returns {string|null}
   */
  getCollisionPath(objectId) {
    if (!this.currentScenePath) return null;
    return this.basePath + this.currentScenePath + '/collision/' + objectId + '.glb';
  }

  /**
   * Compute total mass for an object from its physics links
   * @param {Object} meta - Object metadata
   * @returns {number}
   */
  static getTotalMass(meta) {
    if (!meta || !meta.physics || !meta.physics.links) return 0;
    let total = 0;
    for (const link of Object.values(meta.physics.links)) {
      total += link.mass || 0;
    }
    return total;
  }

  /**
   * Clear cached metadata
   */
  clear() {
    this.metadata = null;
    this.objectMap.clear();
    this.currentScenePath = null;
  }
}
