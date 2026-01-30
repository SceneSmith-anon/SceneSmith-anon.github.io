/**
 * OverlayManager - Collision mesh and inertia ellipsoid overlays for the isolated viewer
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Distinct colors for convex collision pieces
const COLLISION_COLORS = [
  0xe6194b, 0x3cb44b, 0x4363d8, 0xf58231, 0x911eb4,
  0x42d4f4, 0xf032e6, 0xbfef45, 0xfabed4, 0x469990,
  0xdcbeff, 0x9a6324, 0xfffac8, 0x800000, 0xaaffc3,
  0x808000, 0xffd8b1, 0x000075, 0xa9a9a9, 0xe6beff
];

export class OverlayManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.collisionGroup = null;
    this.inertiaGroup = null;
    this.collisionVisible = false;
    this.inertiaVisible = false;
  }

  /**
   * Load and display collision overlay.
   * If the collision GLB cannot be loaded (e.g. 404), falls back to using
   * the visual mesh with collision coloring (for objects whose visual mesh
   * is already convex).
   * @param {string} collisionPath - URL to collision GLB
   * @param {THREE.Scene} scene - The isolated viewer scene
   * @param {Object} objectTransform - The visual object's centering/scaling transform
   * @param {THREE.Object3D} [fallbackObject] - Visual object to use if collision GLB is missing
   * @returns {Promise<void>}
   */
  async showCollision(collisionPath, scene, objectTransform, fallbackObject) {
    this.hideCollision(scene);

    let usedFallback = false;

    try {
      const gltf = await this._loadGLTF(collisionPath);
      this.collisionGroup = new THREE.Group();
      this.collisionGroup.userData.isOverlay = true;

      let pieceIndex = 0;
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const material = new THREE.MeshBasicMaterial({
            color: COLLISION_COLORS[pieceIndex % COLLISION_COLORS.length],
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(child.geometry.clone(), material);
          mesh.applyMatrix4(child.matrixWorld);
          this.collisionGroup.add(mesh);
          pieceIndex++;
        }
      });

      // Collision GLBs are in Z-up frame: rotate 180° around X to match Y-up visual
      // Apply as a nested group so the visual object's transform can be applied on top
      const innerGroup = new THREE.Group();
      while (this.collisionGroup.children.length > 0) {
        innerGroup.add(this.collisionGroup.children[0]);
      }
      innerGroup.rotation.x = Math.PI;
      this.collisionGroup.add(innerGroup);
    } catch (err) {
      // Collision GLB not available — fall back to the visual mesh
      if (fallbackObject) {
        console.info('Collision GLB not found, using visual mesh as collision:', collisionPath);
        this.collisionGroup = new THREE.Group();
        this.collisionGroup.userData.isOverlay = true;
        usedFallback = true;

        let pieceIndex = 0;
        fallbackObject.traverse((child) => {
          if (child.isMesh) {
            const material = new THREE.MeshBasicMaterial({
              color: COLLISION_COLORS[pieceIndex % COLLISION_COLORS.length],
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(child.geometry.clone(), material);
            // Use the child's local-to-root matrix (excluding the root's transform)
            mesh.applyMatrix4(child.matrixWorld);
            this.collisionGroup.add(mesh);
            pieceIndex++;
          }
        });
      } else {
        console.warn('Failed to load collision mesh:', err);
        return;
      }
    }

    // Apply the same centering/scaling as the visual object.
    // For the fallback case (visual mesh), matrixWorld already includes the
    // root object's transform, so we skip re-applying objectTransform.
    if (!usedFallback && objectTransform) {
      this.collisionGroup.position.copy(objectTransform.position);
      this.collisionGroup.scale.copy(objectTransform.scale);
      this.collisionGroup.quaternion.copy(objectTransform.quaternion);
    }

    scene.add(this.collisionGroup);
    this.collisionVisible = true;
  }

  /**
   * Hide collision overlay
   * @param {THREE.Scene} scene
   */
  hideCollision(scene) {
    if (this.collisionGroup) {
      this._disposeGroup(this.collisionGroup);
      scene.remove(this.collisionGroup);
      this.collisionGroup = null;
    }
    this.collisionVisible = false;
  }

  /**
   * Show inertia ellipsoid overlay computed from the visual mesh geometry.
   * Uses signed tetrahedron volume integrals on the UNSCALED mesh geometry to
   * compute the exact inertia tensor assuming uniform density (mass / volume).
   * Then applies Drake's water-density scaling for the ellipsoid size, and
   * finally transforms the result into the isolated viewer's coordinate space.
   * @param {Object} physics - The physics metadata (has .links with mass)
   * @param {THREE.Object3D} visualObject - The current object in the isolated viewer
   */
  showInertia(physics, visualObject) {
    this.hideInertia();

    if (!physics || !physics.links || !visualObject) return;

    // Sum total mass from all links
    let totalMass = 0;
    for (const link of Object.values(physics.links)) {
      totalMass += (link.mass || 0);
    }
    if (totalMass <= 0) return;

    // Ensure world matrices are up to date
    visualObject.updateMatrixWorld(true);

    // Extract the viewer's root transform (centering + scaling) so we can
    // strip it from vertex positions to work in the original mesh space.
    // The isolated viewer applies: position.sub(center) then scale.multiplyScalar(s)
    // to visualObject. We need the inverse of this to get original-space vertices.
    const viewerScale = visualObject.scale.x; // uniform scale
    const viewerPos = visualObject.position.clone();
    const viewerQuat = visualObject.quaternion.clone();

    // Build the inverse of the viewer root transform
    const rootMatrix = new THREE.Matrix4().compose(viewerPos, viewerQuat, visualObject.scale);
    const rootMatrixInverse = rootMatrix.clone().invert();

    // Collect all triangles in ORIGINAL (unscaled) mesh space
    const triangles = [];
    visualObject.traverse((child) => {
      if (!child.isMesh || !child.geometry || child.userData.isOverlay) return;
      const geo = child.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;
      const index = geo.index;
      // World matrix with viewer root transform stripped out = original mesh space
      const localMatrix = new THREE.Matrix4().multiplyMatrices(rootMatrixInverse, child.matrixWorld);

      const getVertex = (i) => {
        const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        v.applyMatrix4(localMatrix);
        return v;
      };

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          triangles.push([getVertex(index.getX(i)), getVertex(index.getX(i+1)), getVertex(index.getX(i+2))]);
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          triangles.push([getVertex(i), getVertex(i+1), getVertex(i+2)]);
        }
      }
    });

    if (triangles.length === 0) return;

    // Compute volume, center of mass, and inertia tensor using signed tetrahedron method.
    // Reference: "Polyhedral Mass Properties" (Mirtich 1996)
    let volume = 0;
    let cx = 0, cy = 0, cz = 0;

    for (const [a, b, c] of triangles) {
      const crossX = b.y * c.z - b.z * c.y;
      const crossY = b.z * c.x - b.x * c.z;
      const crossZ = b.x * c.y - b.y * c.x;
      const vol6 = a.x * crossX + a.y * crossY + a.z * crossZ;

      volume += vol6;
      cx += vol6 * (a.x + b.x + c.x);
      cy += vol6 * (a.y + b.y + c.y);
      cz += vol6 * (a.z + b.z + c.z);
    }

    volume /= 6;
    const absVolume = Math.abs(volume);
    if (absVolume < 1e-12) return;

    // Center of mass (in original mesh space)
    const comX = cx / (24 * volume);
    const comY = cy / (24 * volume);
    const comZ = cz / (24 * volume);

    // Density = mass / volume (real-world units)
    const density = totalMass / absVolume;

    // Compute second moments using signed tetrahedron integrals about origin
    let xx = 0, yy = 0, zz = 0, xy = 0, xz = 0, yz = 0;

    for (const [a, b, c] of triangles) {
      const crossX = b.y * c.z - b.z * c.y;
      const crossY = b.z * c.x - b.x * c.z;
      const crossZ = b.x * c.y - b.y * c.x;
      const vol6 = a.x * crossX + a.y * crossY + a.z * crossZ;

      xx += vol6 * (2*a.x*a.x + 2*b.x*b.x + 2*c.x*c.x + a.x*b.x + a.x*c.x + b.x*c.x);
      yy += vol6 * (2*a.y*a.y + 2*b.y*b.y + 2*c.y*c.y + a.y*b.y + a.y*c.y + b.y*c.y);
      zz += vol6 * (2*a.z*a.z + 2*b.z*b.z + 2*c.z*c.z + a.z*b.z + a.z*c.z + b.z*c.z);
      xy += vol6 * (2*a.x*a.y + 2*b.x*b.y + 2*c.x*c.y + a.x*b.y + a.y*b.x + a.x*c.y + a.y*c.x + b.x*c.y + b.y*c.x);
      xz += vol6 * (2*a.x*a.z + 2*b.x*b.z + 2*c.x*c.z + a.x*b.z + a.z*b.x + a.x*c.z + a.z*c.x + b.x*c.z + b.z*c.x);
      yz += vol6 * (2*a.y*a.z + 2*b.y*b.z + 2*c.y*c.z + a.y*b.z + a.z*b.y + a.y*c.z + a.z*c.y + b.y*c.z + b.z*c.y);
    }

    // Normalize
    xx /= 60; yy /= 60; zz /= 60;
    xy /= 120; xz /= 120; yz /= 120;

    // Shift to center of mass using parallel axis theorem
    const V = volume;
    xx -= V * comX * comX;
    yy -= V * comY * comY;
    zz -= V * comZ * comZ;
    xy -= V * comX * comY;
    xz -= V * comX * comZ;
    yz -= V * comY * comZ;

    // Inertia tensor about center of mass
    const s = xx + yy + zz;
    const tensor = [
      [density * (s - xx), -density * xy,       -density * xz],
      [-density * xy,       density * (s - yy),  -density * yz],
      [-density * xz,      -density * yz,         density * (s - zz)]
    ];

    // Eigendecompose to get principal moments and axes
    const { eigenvalues, eigenvectors } = jacobiEigendecomposition(tensor);

    const I1 = eigenvalues[0];
    const I2 = eigenvalues[1];
    const I3 = eigenvalues[2];

    // Compute equivalent ellipsoid semi-axes from principal moments (Drake formula).
    // For solid ellipsoid: Ixx = m/5*(b²+c²), etc.
    // Solving: a² = 5/(2m)*(-I1+I2+I3), etc.
    const factor = 5 / (2 * totalMass);
    const aSquared = factor * (-I1 + I2 + I3);
    const bSquared = factor * (I1 - I2 + I3);
    const cSquared = factor * (I1 + I2 - I3);

    let ea = aSquared > 0 ? Math.sqrt(aSquared) : 0.001;
    let eb = bSquared > 0 ? Math.sqrt(bSquared) : 0.001;
    let ec = cSquared > 0 ? Math.sqrt(cSquared) : 0.001;

    // Clamp extreme ratios: no semi-axis smaller than 1/100 of the max (Drake convention)
    const maxR = Math.max(ea, eb, ec);
    ea = Math.max(ea, 0.01 * maxR);
    eb = Math.max(eb, 0.01 * maxR);
    ec = Math.max(ec, 0.01 * maxR);

    // Drake-style water density scaling: scale the ellipsoid so that at
    // 1000 kg/m³ density, its volume matches the actual mass.
    const REF_DENSITY = 1000.0;
    const ellipsoidVolume = (4 / 3) * Math.PI * ea * eb * ec;
    const ellipsoidMassAtRefDensity = REF_DENSITY * ellipsoidVolume;
    if (ellipsoidMassAtRefDensity > 0) {
      const volumeScale = totalMass / ellipsoidMassAtRefDensity;
      const linearScale = Math.cbrt(volumeScale);
      ea *= linearScale;
      eb *= linearScale;
      ec *= linearScale;
    }

    // Now ea, eb, ec are in real-world meters. Transform into viewer space:
    // apply the same uniform scale the isolated viewer uses.
    ea *= viewerScale;
    eb *= viewerScale;
    ec *= viewerScale;

    // Transform center of mass into viewer space
    const comViewer = new THREE.Vector3(comX, comY, comZ);
    comViewer.applyMatrix4(rootMatrix);

    this.inertiaGroup = new THREE.Group();
    this.inertiaGroup.userData.isOverlay = true;

    // Create ellipsoid (unit sphere scaled to semi-axes)
    const geometry = new THREE.SphereGeometry(1, 24, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    const ellipsoid = new THREE.Mesh(geometry, material);
    ellipsoid.scale.set(ea, eb, ec);

    // Orient using eigenvectors (columns of rotation matrix),
    // then apply the viewer's rotation to bring into viewer space
    const eigenRotMatrix = new THREE.Matrix4();
    const ev = eigenvectors;
    eigenRotMatrix.set(
      ev[0][0], ev[0][1], ev[0][2], 0,
      ev[1][0], ev[1][1], ev[1][2], 0,
      ev[2][0], ev[2][1], ev[2][2], 0,
      0, 0, 0, 1
    );
    const eigenQuat = new THREE.Quaternion().setFromRotationMatrix(eigenRotMatrix);
    // Compose: viewer rotation * eigenvector rotation
    ellipsoid.quaternion.copy(viewerQuat).multiply(eigenQuat);

    // Position at center of mass in viewer space
    ellipsoid.position.copy(comViewer);
    this.inertiaGroup.add(ellipsoid);

    // Add to scene
    visualObject.parent.add(this.inertiaGroup);
    this.inertiaVisible = true;
  }

  /**
   * Hide inertia overlay
   * @param {THREE.Object3D} [parentObject] - The parent the inertia group was added to
   */
  hideInertia(parentObject) {
    if (this.inertiaGroup) {
      this._disposeGroup(this.inertiaGroup);
      if (this.inertiaGroup.parent) {
        this.inertiaGroup.parent.remove(this.inertiaGroup);
      }
      this.inertiaGroup = null;
    }
    this.inertiaVisible = false;
  }

  /**
   * Clear all overlays
   * @param {THREE.Scene} scene
   */
  clearAll(scene) {
    this.hideCollision(scene);
    this.hideInertia();
  }

  /**
   * Load a GLTF/GLB file
   * @param {string} url
   * @returns {Promise<Object>}
   */
  _loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  /**
   * Dispose of a group and all its children
   * @param {THREE.Group} group
   */
  _disposeGroup(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }
}


/**
 * Jacobi eigendecomposition for a 3x3 symmetric matrix.
 * Returns eigenvalues and eigenvectors.
 */
function jacobiEigendecomposition(matrix) {
  // Copy matrix
  const a = [
    [matrix[0][0], matrix[0][1], matrix[0][2]],
    [matrix[1][0], matrix[1][1], matrix[1][2]],
    [matrix[2][0], matrix[2][1], matrix[2][2]]
  ];

  // Initialize eigenvectors as identity
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  const maxIter = 50;
  const epsilon = 1e-12;

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0, q = 1;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        if (Math.abs(a[i][j]) > maxVal) {
          maxVal = Math.abs(a[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < epsilon) break;

    // Compute rotation angle
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply Jacobi rotation
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let r = 0; r < 3; r++) {
      if (r !== p && r !== q) {
        const arp = a[r][p];
        const arq = a[r][q];
        a[r][p] = c * arp - s * arq;
        a[p][r] = a[r][p];
        a[r][q] = s * arp + c * arq;
        a[q][r] = a[r][q];
      }
    }

    // Update eigenvectors
    for (let r = 0; r < 3; r++) {
      const vrp = v[r][p];
      const vrq = v[r][q];
      v[r][p] = c * vrp - s * vrq;
      v[r][q] = s * vrp + c * vrq;
    }
  }

  return {
    eigenvalues: [a[0][0], a[1][1], a[2][2]],
    eigenvectors: v
  };
}
