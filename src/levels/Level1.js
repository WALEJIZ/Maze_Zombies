import * as THREE from 'three';
import { Zombie } from '../enemies/Zombie.js';

// Reusable temp vectors (avoid per-frame allocations)
const _tmpTargetA = new THREE.Vector3();
const _tmpTargetB = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();

/**
 * Level1 - "The Maze"
 * Minecraft-style maze with walls. Kill zombies, find the janitor's key, escape.
 *
 * Maze legend:
 *  '#' = wall (stone block)
 *  '.' = open path
 *  'P' = player spawn
 *  'E' = exit door
 *  'Z' = zombie spawn
 *  'J' = janitor zombie spawn
 *  'C' = circular path hub
 */
export class Level1 {
  constructor(scene) {
    this.scene = scene;
    this.zombies = [];
    this.disposables = [];
    this.obstacles = [];
    this.wallMeshes = [];
    this.keyMesh = null;
    this.keyCollected = false;
    this.exitDoor = null;
    this.exitDoorPosition = null;
    this.levelComplete = false;
    this.janitorZombie = null;
    this.cellSize = 2; // each maze cell is 2x2 world units
    this.maze = null;
    this.mazeWidth = 0;
    this.mazeHeight = 0;

    // Wall occlusion (fade walls between camera and player)
    this.occlusionRaycaster = new THREE.Raycaster();
    this.wallMatOpaque = null;
    this.wallMatFaded = null;
  }

  async load(onProgress) {
    this._createLighting();
    onProgress && onProgress(0.2);

    this._buildMaze();
    onProgress && onProgress(0.5);

    this._createGround();
    onProgress && onProgress(0.6);

    this._spawnZombies();
    onProgress && onProgress(0.8);

    this._createExitDoor();
    onProgress && onProgress(1.0);
  }

  get spawnPoint() {
    // Player spawn at 'P' position in maze (row 1, col 1)
    return this._cellToWorld(1, 1);
  }

  get title() {
    return 'The Maze - Find the Key, Escape!';
  }

  // =================== MAZE LAYOUT ===================
  // 29 wide x 19 tall maze with circular paths
  _getMazeData() {
    return [
      '#############################',
      '#P..........#...............#',
      '#.#####.###.#.###.#####.###.#',
      '#.#.....#.#...#.#...#...#...#',
      '#.#.###.#.#####.###.#.#.#.#.#',
      '#.#...#.#.......C...#.#.#.#.#',
      '#.###.#.#########.###.#.#.#.#',
      '#.....#...........#.......#.#',
      '#.###########.###.#########.#',
      '#.#.........#.#Z#.........#.#',
      '#.#.#######.#.#.#.#######.#.#',
      '#.#.#.....#.#...#.#.....#.#.#',
      '#.#.#.###.#.#####.#.###.#...#',
      '#...#...#.#.......#...#.#.#.#',
      '###.###.#.#########.#.#.#.#.#',
      '#J......#.....C.....#.......E',
      '#.#####.#####.#####.#######.#',
      '#.Z.....#..................Z#',
      '#############################',
    ];
  }

  _cellToWorld(col, row) {
    // Center the maze around origin
    const offsetX = -(this.mazeWidth * this.cellSize) / 2;
    const offsetZ = -(this.mazeHeight * this.cellSize) / 2;
    return new THREE.Vector3(
      offsetX + col * this.cellSize + this.cellSize / 2,
      0,
      offsetZ + row * this.cellSize + this.cellSize / 2
    );
  }

  _buildMaze() {
    this.maze = this._getMazeData();
    this.mazeHeight = this.maze.length;
    this.mazeWidth = this.maze[0].length;
    const cs = this.cellSize;
    const wallHeight = 3.0;

    // Stone wall materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.95,
      metalness: 0.0
    });
    // Semi-transparent variant for walls blocking the camera's view of the player
    const wallMatFaded = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    this.wallMatOpaque = wallMat;
    this.wallMatFaded = wallMatFaded;
    this.disposables.push(wallMat, wallMatFaded);

    // Use instanced-like approach: merge wall segments
    const wallGeo = new THREE.BoxGeometry(cs, wallHeight, cs);
    this.disposables.push(wallGeo);

    for (let row = 0; row < this.mazeHeight; row++) {
      for (let col = 0; col < this.mazeWidth; col++) {
        const cell = this.maze[row][col];
        const worldPos = this._cellToWorld(col, row);

        if (cell === '#') {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(worldPos.x, wallHeight / 2, worldPos.z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.wallMeshes.push(wall);

          // Obstacle for collision
          this.obstacles.push({
            x: worldPos.x,
            z: worldPos.z,
            radius: cs / 2 + 0.1
          });
        } else if (cell === 'C') {
          // Circular path marker - place a floor disc
          const discGeo = new THREE.CylinderGeometry(cs * 0.8, cs * 0.8, 0.05, 16);
          const discMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.1
          });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.position.set(worldPos.x, 0.03, worldPos.z);
          disc.receiveShadow = true;
          this.scene.add(disc);
          this.disposables.push(discGeo, discMat);
        }
      }
    }
  }

  _createGround() {
    const totalWidth = this.mazeWidth * this.cellSize;
    const totalHeight = this.mazeHeight * this.cellSize;

    const groundGeo = new THREE.PlaneGeometry(totalWidth + 4, totalHeight + 4);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.95
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.disposables.push(groundGeo, groundMat);
  }

  _createLighting() {
    // Overhead directional light
    this.sunLight = new THREE.DirectionalLight(0xffe4b5, 2.0);
    this.sunLight.position.set(20, 30, 15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);
    this.disposables.push(this.sunLight);

    // Ambient
    this.ambientLight = new THREE.AmbientLight(0x556677, 0.6);
    this.scene.add(this.ambientLight);
    this.disposables.push(this.ambientLight);

    // Hemisphere
    this.hemiLight = new THREE.HemisphereLight(0x8899aa, 0x333333, 0.3);
    this.scene.add(this.hemiLight);
    this.disposables.push(this.hemiLight);

    // Fog for atmosphere
    this.fog = new THREE.FogExp2(0x1a1a2e, 0.025);
    this.scene.fog = this.fog;
  }

  _spawnZombies() {
    // Find spawn positions from maze
    const regularSpawns = [];
    let janitorSpawn = null;

    for (let row = 0; row < this.mazeHeight; row++) {
      for (let col = 0; col < this.mazeWidth; col++) {
        const cell = this.maze[row][col];
        if (cell === 'Z') {
          regularSpawns.push(this._cellToWorld(col, row));
        } else if (cell === 'J') {
          janitorSpawn = this._cellToWorld(col, row);
        }
      }
    }

    // Spawn regular zombies
    for (const pos of regularSpawns) {
      const zombie = new Zombie(this.scene, pos, { isJanitor: false });
      this.zombies.push(zombie);
    }

    // Also spawn some extra zombies in open areas (far from player start)
    const extraPositions = [
      this._cellToWorld(15, 5),
      this._cellToWorld(23, 9),
      this._cellToWorld(21, 13),
    ];
    for (const pos of extraPositions) {
      const zombie = new Zombie(this.scene, pos, { isJanitor: false });
      this.zombies.push(zombie);
    }

    // Spawn janitor zombie
    if (janitorSpawn) {
      this.janitorZombie = new Zombie(this.scene, janitorSpawn, { isJanitor: true });
      this.zombies.push(this.janitorZombie);
    }
  }

  _createExitDoor() {
    // Find 'E' in maze
    for (let row = 0; row < this.mazeHeight; row++) {
      for (let col = 0; col < this.mazeWidth; col++) {
        if (this.maze[row][col] === 'E') {
          const pos = this._cellToWorld(col, row);
          this.exitDoorPosition = pos.clone();

          // Door frame
          const doorGroup = new THREE.Group();
          doorGroup.position.copy(pos);

          // Door panel
          const doorGeo = new THREE.BoxGeometry(1.5, 2.8, 0.2);
          const doorMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7
          });
          const door = new THREE.Mesh(doorGeo, doorMat);
          door.position.y = 1.4;
          door.castShadow = true;
          doorGroup.add(door);

          // Door frame
          const frameMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.5,
            metalness: 0.3
          });
          const frameTopGeo = new THREE.BoxGeometry(1.8, 0.15, 0.3);
          const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
          frameTop.position.y = 2.85;
          doorGroup.add(frameTop);

          const frameSideGeo = new THREE.BoxGeometry(0.15, 2.8, 0.3);
          const frameLeft = new THREE.Mesh(frameSideGeo, frameMat);
          frameLeft.position.set(-0.83, 1.4, 0);
          doorGroup.add(frameLeft);
          const frameRight = new THREE.Mesh(frameSideGeo, frameMat);
          frameRight.position.set(0.83, 1.4, 0);
          doorGroup.add(frameRight);

          // Keyhole indicator (gold circle)
          const keyholeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
          const keyholeMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.5
          });
          const keyhole = new THREE.Mesh(keyholeGeo, keyholeMat);
          keyhole.position.set(0.4, 1.2, 0.13);
          doorGroup.add(keyhole);

          // "EXIT" sign above door
          const signGeo = new THREE.BoxGeometry(1.0, 0.3, 0.05);
          const signMat = new THREE.MeshStandardMaterial({
            color: 0x00aa00,
            emissive: 0x00aa00,
            emissiveIntensity: 1.0
          });
          const sign = new THREE.Mesh(signGeo, signMat);
          sign.position.y = 3.2;
          doorGroup.add(sign);

          // Light above door
          const doorLight = new THREE.PointLight(0x00ff44, 2, 8);
          doorLight.position.y = 3.5;
          doorGroup.add(doorLight);

          this.exitDoor = doorGroup;
          this.scene.add(doorGroup);
          return;
        }
      }
    }
  }

  /** Spawn a key at the given world position (when janitor dies). */
  spawnKey(position) {
    if (this.keyMesh) return;

    const keyGroup = new THREE.Group();
    keyGroup.name = 'Key';

    // Key body (gold cylinder)
    const keyBodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const keyBody = new THREE.Mesh(keyBodyGeo, keyMat);
    keyBody.rotation.z = Math.PI / 2;
    keyGroup.add(keyBody);

    // Key head (torus)
    const keyHeadGeo = new THREE.TorusGeometry(0.12, 0.04, 6, 8);
    const keyHead = new THREE.Mesh(keyHeadGeo, keyMat);
    keyHead.position.x = -0.2;
    keyGroup.add(keyHead);

    // Key teeth
    const toothGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
    for (let i = 0; i < 3; i++) {
      const tooth = new THREE.Mesh(toothGeo, keyMat);
      tooth.position.set(0.1 + i * 0.08, -0.06, 0);
      keyGroup.add(tooth);
    }

    keyGroup.position.copy(position);
    keyGroup.position.y = 0.8;

    // Glow light
    const keyLight = new THREE.PointLight(0xffd700, 2, 5);
    keyGroup.add(keyLight);

    this.scene.add(keyGroup);
    this.keyMesh = keyGroup;
  }

  /**
   * Fades walls that sit between the camera and the player so the player
   * and everything in front of them stay clearly visible.
   */
  updateWallOcclusion(cameraPosition, playerPosition) {
    if (!this.wallMeshes.length || !this.wallMatFaded) return;

    const occluding = new Set();

    // Rays from the camera to the player's head and torso cover the body
    const targets = [
      _tmpTargetA.set(playerPosition.x, playerPosition.y + 1.5, playerPosition.z),
      _tmpTargetB.set(playerPosition.x, playerPosition.y + 0.8, playerPosition.z)
    ];

    for (const target of targets) {
      _tmpDir.subVectors(target, cameraPosition);
      const dist = _tmpDir.length();
      if (dist < 0.001) continue; // 1st person: camera is at the player
      _tmpDir.divideScalar(dist);

      this.occlusionRaycaster.set(cameraPosition, _tmpDir);
      this.occlusionRaycaster.far = dist; // only walls BETWEEN camera and player
      const hits = this.occlusionRaycaster.intersectObjects(this.wallMeshes, false);
      for (const hit of hits) occluding.add(hit.object);
    }

    // Swap materials: faded for occluding walls, opaque for the rest
    for (const wall of this.wallMeshes) {
      if (occluding.has(wall)) {
        if (wall.material !== this.wallMatFaded) wall.material = this.wallMatFaded;
      } else if (wall.material !== this.wallMatOpaque) {
        wall.material = this.wallMatOpaque;
      }
    }
  }

  /**
   * Per-frame update.
   * Returns events for Game.js to react to.
   */
  update(dt, player, time) {
    const events = {
      zombieKilled: false,
      chainKills: 0,
      keyDropped: false,
      keyCollected: false,
      levelComplete: false
    };

    // Animate key (float and spin)
    if (this.keyMesh && !this.keyCollected) {
      this.keyMesh.position.y = 0.8 + Math.sin(time * 3) * 0.2;
      this.keyMesh.rotation.y += dt * 2;

      // Check player pickup
      const dist = player.group.position.distanceTo(this.keyMesh.position);
      if (dist < 1.5) {
        this.keyCollected = true;
        player.hasKey = true;
        this.scene.remove(this.keyMesh);
        events.keyCollected = true;
      }
    }

    // Update zombies (pass obstacles for wall-aware movement)
    for (const zombie of this.zombies) {
      const result = zombie.update(dt, player.group.position, this.obstacles);
      if (result.hit) {
        player.takeDamage(result.damage);
      }
    }

    // Check if player reached exit door with key
    if (this.exitDoorPosition && player.hasKey && !this.levelComplete) {
      const dist = player.group.position.distanceTo(this.exitDoorPosition);
      if (dist < 2.0) {
        this.levelComplete = true;
        events.levelComplete = true;
      }
    }

    // Pulse exit door
    if (this.exitDoor) {
      this.exitDoor.traverse((child) => {
        if (child.isMesh && child.material.emissive && child.material.emissiveIntensity > 0) {
          child.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        }
      });
    }

    return events;
  }

  /** Handle a zombie being killed - check for janitor key drop and chain explosion. */
  handleZombieKilled(zombie, killedPosition) {
    let chainKills = 0;

    // If janitor, drop key
    if (zombie.isJanitor && !this.keyCollected) {
      this.spawnKey(killedPosition.clone());
    }

    // Chain explosion: kill all zombies within explosion radius
    for (const other of this.zombies) {
      if (other === zombie || !other.alive) continue;
      const dist = other.group.position.distanceTo(killedPosition);
      if (dist < zombie.explosionRadius) {
        // Instantly kill this zombie too (chain reaction)
        other.explode();
        chainKills++;

        // If this chained zombie is also a janitor, drop key
        if (other.isJanitor && !this.keyCollected) {
          this.spawnKey(other.group.position.clone());
        }
      }
    }

    return chainKills;
  }

  getObstacles() {
    return this.obstacles;
  }

  dispose() {
    // Dispose zombies
    for (const zombie of this.zombies) zombie.dispose();
    this.zombies = [];

    // Dispose key
    if (this.keyMesh) {
      this.scene.remove(this.keyMesh);
      this.keyMesh.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this.keyMesh = null;
    }

    // Dispose exit door
    if (this.exitDoor) {
      this.scene.remove(this.exitDoor);
      this.exitDoor.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this.exitDoor = null;
    }

    // Dispose walls
    for (const wall of this.wallMeshes) {
      this.scene.remove(wall);
    }
    this.wallMeshes = [];
    this.obstacles = [];

    // Dispose ground
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      this.ground.material.dispose();
    }

    // Dispose lights and fog
    for (const d of this.disposables) {
      if (d.isLight || d.isFog) {
        this.scene.remove(d);
      } else if (d.dispose) {
        d.dispose();
      }
    }
    this.disposables = [];
    this.scene.fog = null;
  }
}
