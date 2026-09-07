import * as THREE from 'three';

/**
 * Zombie - Minecraft-style cubic zombie enemy.
 * Takes 3 hits to kill. Explodes on 3rd hit with chain explosion.
 * Janitor variant drops a key on death.
 */
export class Zombie {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.alive = true;
    this.speed = 1.5 + Math.random() * 1.0;
    this.damage = 10;
    this.damageCooldown = 0;
    this.damageRate = 1.0;
    this.hitsRemaining = 3;
    this.isJanitor = options.isJanitor || false;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.exploding = false;
    this.explosionParticles = [];
    this.explosionTimer = 0;
    this.explosionDuration = 1.0;
    this.explosionRadius = 1.8; // length of zombie body

    this.group = new THREE.Group();
    this.group.name = this.isJanitor ? 'JanitorZombie' : 'Zombie';
    this.group.position.copy(position);
    scene.add(this.group);

    this._buildModel();
  }

  _buildModel() {
    const zombieGreen = 0x4a7a3a;
    const darkGreen = 0x2a5a2a;
    const eyeRed = 0xff0000;

    if (this.isJanitor) {
      this._buildJanitorModel(zombieGreen, darkGreen, eyeRed);
    } else {
      this._buildRegularModel(zombieGreen, darkGreen, eyeRed);
    }
  }

  _buildRegularModel(zombieGreen, darkGreen, eyeRed) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: zombieGreen, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x6a9a5a, roughness: 0.8 });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.95;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Eyes (red glowing)
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeRed, emissive: eyeRed, emissiveIntensity: 2.0
    });
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.05, 0.26);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.05, 0.26);
    this.head.add(leftEye, rightEye);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.2, 0.06, 0.05);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x2a0a0a });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.12, 0.26);
    this.head.add(mouth);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.75, 0.3);
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.y = 1.3;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Arms (outstretched zombie style)
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.35, 1.65, 0);
    this.leftArmPivot.rotation.x = -Math.PI / 3; // outstretched
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.y = -0.35;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    this.group.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.35, 1.65, 0);
    this.rightArmPivot.rotation.x = -Math.PI / 3;
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.y = -0.35;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);
    this.group.add(this.rightArmPivot);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, 0.9, 0);
    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.y = -0.35;
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);
    this.group.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, 0.9, 0);
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.y = -0.35;
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);
    this.group.add(this.rightLegPivot);
  }

  _buildJanitorModel(zombieGreen, darkGreen, eyeRed) {
    // Janitor wears blue overalls
    const overallMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x6a9a5a, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.9 });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.95;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeRed, emissive: eyeRed, emissiveIntensity: 2.0
    });
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.05, 0.26);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.05, 0.26);
    this.head.add(leftEye, rightEye);

    // Janitor cap
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.7 });
    const capGeo = new THREE.BoxGeometry(0.52, 0.12, 0.52);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.28;
    this.head.add(cap);
    const capBrimGeo = new THREE.BoxGeometry(0.56, 0.04, 0.2);
    const capBrim = new THREE.Mesh(capBrimGeo, capMat);
    capBrim.position.set(0, 0.22, 0.2);
    this.head.add(capBrim);

    // Torso (overalls)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.75, 0.3);
    this.torso = new THREE.Mesh(torsoGeo, overallMat);
    this.torso.position.y = 1.3;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Name badge
    const badgeGeo = new THREE.BoxGeometry(0.15, 0.08, 0.02);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0.12, 0.2, 0.16);
    this.torso.add(badge);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.35, 1.65, 0);
    this.leftArmPivot.rotation.x = -Math.PI / 3;
    const leftArm = new THREE.Mesh(armGeo, overallMat);
    leftArm.position.y = -0.35;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    this.group.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.35, 1.65, 0);
    this.rightArmPivot.rotation.x = -Math.PI / 3;
    const rightArm = new THREE.Mesh(armGeo, overallMat);
    rightArm.position.y = -0.35;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);
    this.group.add(this.rightArmPivot);

    // Legs (overalls)
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, 0.9, 0);
    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.y = -0.35;
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);
    this.group.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, 0.9, 0);
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.y = -0.35;
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);
    this.group.add(this.rightLegPivot);
  }

  takeDamage() {
    if (!this.alive || this.exploding) return { killed: false, exploded: false };

    this.hitsRemaining--;
    this._flashHit();

    if (this.hitsRemaining <= 0) {
      this.explode();
      return { killed: true, exploded: true };
    }
    return { killed: false, exploded: false };
  }

  explode() {
    this.alive = false;
    this.exploding = true;
    this.explosionTimer = 0;

    // Hide the body
    this.group.visible = false;

    // Create explosion particles (Minecraft-style block debris)
    const colors = this.isJanitor
      ? [0x2255aa, 0x1a3a6a, 0x6a9a5a, 0xffffff]
      : [0x4a7a3a, 0x2a5a2a, 0x6a9a5a, 0xff4444];

    for (let i = 0; i < 24; i++) {
      const size = 0.08 + Math.random() * 0.15;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.9
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(this.group.position);
      particle.position.y += 0.5 + Math.random() * 1.2;

      // Random velocity in all directions
      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.6;
      const speed = 3 + Math.random() * 6;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.sin(upAngle) * speed,
        Math.cos(upAngle) * speed + 2,
        Math.sin(angle) * Math.sin(upAngle) * speed
      );
      particle.userData.rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      this.scene.add(particle);
      this.explosionParticles.push(particle);
    }

    // Explosion flash light
    const flashLight = new THREE.PointLight(0xff6600, 8, 10);
    flashLight.position.copy(this.group.position);
    flashLight.position.y += 1;
    this.scene.add(flashLight);
    setTimeout(() => {
      this.scene.remove(flashLight);
    }, 200);
  }

  _flashHit() {
    this.group.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive.setHex(0xffffff);
        child.material.emissiveIntensity = 0.8;
        setTimeout(() => {
          if (child.material && child.material.emissive) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }, 120);
      }
    });
  }

  _updateExplosion(dt) {
    this.explosionTimer += dt;

    for (const particle of this.explosionParticles) {
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(dt));
      particle.userData.velocity.y -= 15 * dt; // gravity
      particle.rotation.x += particle.userData.rotSpeed.x * dt;
      particle.rotation.y += particle.userData.rotSpeed.y * dt;
      particle.rotation.z += particle.userData.rotSpeed.z * dt;

      // Fade out
      if (this.explosionTimer > this.explosionDuration * 0.5) {
        const fadeT = (this.explosionTimer - this.explosionDuration * 0.5) / (this.explosionDuration * 0.5);
        particle.material.opacity = 1 - fadeT;
        particle.material.transparent = true;
      }
    }

    if (this.explosionTimer >= this.explosionDuration) {
      this._cleanupParticles();
      this.exploding = false;
    }
  }

  _cleanupParticles() {
    for (const particle of this.explosionParticles) {
      this.scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    }
    this.explosionParticles = [];
  }

  _updateWalkAnimation(dt) {
    this.walkCycle += dt * 6;
    const swing = Math.sin(this.walkCycle) * 0.5;
    // Arms already outstretched, just add wobble
    if (this.leftArmPivot) {
      this.leftArmPivot.rotation.x = -Math.PI / 3 + swing * 0.2;
      this.leftArmPivot.rotation.z = swing * 0.1;
    }
    if (this.rightArmPivot) {
      this.rightArmPivot.rotation.x = -Math.PI / 3 - swing * 0.2;
      this.rightArmPivot.rotation.z = -swing * 0.1;
    }
    if (this.leftLegPivot) this.leftLegPivot.rotation.x = swing;
    if (this.rightLegPivot) this.rightLegPivot.rotation.x = -swing;
  }

  update(dt, playerPosition, obstacles = []) {
    if (this.exploding) {
      this._updateExplosion(dt);
      return { hit: false, chainKill: false };
    }

    if (!this.alive) return { hit: false, chainKill: false };

    this.damageCooldown = Math.max(0, this.damageCooldown - dt);

    const playerPos = new THREE.Vector3(playerPosition.x, 0, playerPosition.z);
    const zombiePos = new THREE.Vector3(this.group.position.x, 0, this.group.position.z);
    const dir = new THREE.Vector3().subVectors(playerPos, zombiePos);
    const dist = dir.length();

    if (dist > 1.5) {
      dir.normalize();

      // Wall-aware steering: check for walls ahead and steer around them
      let moveX = dir.x;
      let moveZ = dir.z;
      const aheadDist = 1.8;
      const aheadX = this.group.position.x + moveX * aheadDist;
      const aheadZ = this.group.position.z + moveZ * aheadDist;

      for (const obs of obstacles) {
        const dx = aheadX - obs.x;
        const dz = aheadZ - obs.z;
        const dSq = dx * dx + dz * dz;
        const minR = obs.radius + 0.5;
        if (dSq < minR * minR) {
          // Wall ahead - try perpendicular steering
          const perpX = -moveZ;
          const perpZ = moveX;
          // Choose direction that moves us closer to the player
          const dot = perpX * dir.x + perpZ * dir.z;
          if (dot >= 0) {
            moveX = perpX * 0.8 + dir.x * 0.2;
            moveZ = perpZ * 0.8 + dir.z * 0.2;
          } else {
            moveX = -perpX * 0.8 + dir.x * 0.2;
            moveZ = -perpZ * 0.8 + dir.z * 0.2;
          }
          const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (len > 0) { moveX /= len; moveZ /= len; }
          break;
        }
      }

      this.group.position.x += moveX * this.speed * dt;
      this.group.position.z += moveZ * this.speed * dt;

      // Resolve wall collisions
      if (obstacles.length > 0) this._resolveObstacles(obstacles);

      this.group.lookAt(playerPosition.x, this.group.position.y, playerPosition.z);
      this._updateWalkAnimation(dt);
    } else {
      this.group.lookAt(playerPosition.x, this.group.position.y, playerPosition.z);
    }

    // Damage player when close
    if (dist < 1.5 && this.damageCooldown <= 0) {
      this.damageCooldown = this.damageRate;
      return { hit: true, damage: this.damage };
    }

    return { hit: false };
  }

  _resolveObstacles(obstacles) {
    const radius = 0.4;
    for (let pass = 0; pass < 2; pass++) {
      for (const obs of obstacles) {
        const dx = this.group.position.x - obs.x;
        const dz = this.group.position.z - obs.z;
        const minDist = obs.radius + radius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dist > 1e-5 ? dx / dist : 1;
          const nz = dist > 1e-5 ? dz / dist : 0;
          const overlap = minDist - dist;
          this.group.position.x += nx * overlap;
          this.group.position.z += nz * overlap;
        }
      }
    }
  }

  dispose() {
    this._cleanupParticles();
    this.group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
    this.scene.remove(this.group);
  }
}
