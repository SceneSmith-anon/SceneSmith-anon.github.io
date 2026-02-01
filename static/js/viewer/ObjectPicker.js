/**
 * ObjectPicker - Raycaster-based object selection for Three.js scenes
 */

import * as THREE from 'three';

export class ObjectPicker {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.knownObjectIds = null; // Set<string> of valid object IDs from metadata
  }

  /**
   * Set known object IDs from metadata for multi-part selection
   * @param {Set<string>} idSet - Set of valid object_id names
   */
  setKnownObjectIds(idSet) {
    this.knownObjectIds = idSet && idSet.size > 0 ? idSet : null;
  }

  /**
   * Update pointer coordinates from mouse/touch event
   */
  updatePointer(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Pick an object from the scene at the given event coordinates
   * @param {Event} event - Mouse or touch event
   * @param {THREE.Scene} scene - Scene to pick from
   * @returns {Object|null} - { object, point, instanceId } or null if nothing hit
   */
  pick(event, scene) {
    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Get all intersections
    const intersects = this.raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) {
      return null;
    }

    // Find first valid intersection (skip invisible or non-mesh objects)
    for (const intersect of intersects) {
      const object = intersect.object;

      // Skip invisible objects
      if (!object.visible) continue;

      // Skip objects marked as not pickable
      if (object.userData.notPickable) continue;

      // Get the root selectable object (highest parent that's not the scene)
      const selectableObject = this.getSelectableRoot(object);

      // Skip if the selectable root is hidden
      if (!selectableObject.visible) continue;

      return {
        object: selectableObject,
        point: intersect.point.clone(),
        instanceId: intersect.instanceId !== undefined ? intersect.instanceId : null,
        rawObject: object // The actual hit object (useful for instanced meshes)
      };
    }

    return null;
  }

  /**
   * Get the root object that should be selected
   * For grouped objects, returns the closest meaningful parent (not the whole scene)
   * @param {THREE.Object3D} object - The hit object
   * @returns {THREE.Object3D} - The selectable root
   */
  getSelectableRoot(object) {
    // If we have metadata-based object IDs, use them for precise multi-part selection
    if (this.knownObjectIds) {
      let current = object;
      while (current) {
        if (current.name) {
          if (this.knownObjectIds.has(current.name)) {
            return current;
          }
          // Also check with Blender's .001/.002/etc. suffix stripped
          // Three.js GLTFLoader removes dots from names, so .001 becomes 001
          const stripped = current.name.replace(/\.\d+$/, '');
          if (stripped !== current.name && this.knownObjectIds.has(stripped)) {
            return current;
          }
          // Handle dot-stripped names (e.g. toilet_0.001 -> toilet_0001)
          if (current.name.length > 3) {
            const dotless = current.name.slice(0, -3);
            if (this.knownObjectIds.has(dotless)) {
              return current;
            }
          }
        }
        if (!current.parent || current.parent.type === 'Scene') {
          break;
        }
        current = current.parent;
      }
    }

    // Fallback: original heuristic when metadata is unavailable
    let current = object;

    // Names to skip (these are typically scene roots or generic containers)
    const skipNames = ['scene', 'root', 'gltf', 'model', ''];

    // Walk up the hierarchy to find the closest meaningful parent
    // But stop before reaching the scene root
    while (current.parent) {
      const parent = current.parent;

      // Stop at scene level or if parent is the loaded scene root
      if (parent.type === 'Scene') {
        return current;
      }

      // Check if current has a meaningful name (not the hit mesh but a parent group)
      if (current !== object && current.name && current.name !== '') {
        const lowerName = current.name.toLowerCase();
        // If current has a good name and isn't a generic container, use it
        if (!skipNames.some(skip => lowerName === skip || lowerName.startsWith('scene'))) {
          return current;
        }
      }

      // Check for user-marked selectable
      if (current.userData && current.userData.selectable) {
        return current;
      }

      // Only go up one or two levels max to avoid selecting entire scene
      if (this.getDepthFromRoot(current) <= 2) {
        return current;
      }

      current = parent;
    }

    return object;
  }

  /**
   * Get depth from scene root
   * @param {THREE.Object3D} object
   * @returns {number}
   */
  getDepthFromRoot(object) {
    let depth = 0;
    let current = object;
    while (current.parent) {
      depth++;
      current = current.parent;
      if (current.type === 'Scene') break;
    }
    return depth;
  }

  /**
   * Get a display name for an object
   * @param {THREE.Object3D} object - The object
   * @returns {string} - Human-readable name
   */
  getObjectName(object) {
    // Use object name if available
    if (object.name && object.name !== '') {
      return this.formatName(object.name);
    }

    // Check userData for name
    if (object.userData && object.userData.name) {
      return this.formatName(object.userData.name);
    }

    // Fall back to type
    return object.type || 'Object';
  }

  /**
   * Format a name for display (remove underscores, capitalize)
   * @param {string} name - Raw name
   * @returns {string} - Formatted name
   */
  formatName(name) {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Dispose of resources
   */
  dispose() {
    // Nothing to dispose currently
  }
}
