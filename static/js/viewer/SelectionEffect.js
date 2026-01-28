/**
 * SelectionEffect - Simple selection highlighting using emissive glow and bounding box
 */

import * as THREE from 'three';

export class SelectionEffect {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.color = new THREE.Color(options.color || '#e91e63');
    this.glowIntensity = options.glowIntensity || 0.3;

    this.selectedObject = null;
    this.originalMaterials = new Map();
    this.boxHelper = null;
  }

  setSelection(object) {
    // Clear previous selection
    this.clearSelection();

    if (!object) return;

    this.selectedObject = object;

    // Store original materials and apply highlight
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((mat, index) => {
          // Store original emissive state
          const key = `${child.uuid}_${index}`;
          this.originalMaterials.set(key, {
            mesh: child,
            index,
            emissive: mat.emissive ? mat.emissive.clone() : null,
            emissiveIntensity: mat.emissiveIntensity || 0
          });

          // Apply highlight
          if (mat.emissive) {
            mat.emissive.copy(this.color);
            mat.emissiveIntensity = this.glowIntensity;
          }
        });
      }
    });

    // Create bounding box helper
    this.boxHelper = new THREE.BoxHelper(object, this.color);
    this.boxHelper.material.linewidth = 2;
    this.scene.add(this.boxHelper);
  }

  clearSelection() {
    // Restore original materials
    this.originalMaterials.forEach((data, key) => {
      const { mesh, index, emissive, emissiveIntensity } = data;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const mat = materials[index];

      if (mat && emissive) {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = emissiveIntensity;
      }
    });
    this.originalMaterials.clear();

    // Remove box helper
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper.geometry.dispose();
      this.boxHelper.material.dispose();
      this.boxHelper = null;
    }

    this.selectedObject = null;
  }

  update() {
    // Update box helper if object moved
    if (this.boxHelper && this.selectedObject) {
      this.boxHelper.update();
    }
  }

  setColor(color) {
    this.color.set(color);

    if (this.boxHelper) {
      this.boxHelper.material.color.copy(this.color);
    }

    // Update emissive colors of selected object
    if (this.selectedObject) {
      this.selectedObject.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (mat.emissive && this.originalMaterials.size > 0) {
              mat.emissive.copy(this.color);
            }
          });
        }
      });
    }
  }

  dispose() {
    this.clearSelection();
  }
}
