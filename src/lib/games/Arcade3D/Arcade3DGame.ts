import * as THREE from 'three';
import type { ArcadeGameId, ArcadeGameOptions, ArcadeSnapshot } from './types';

type MovingObject = {
  mesh: THREE.Mesh;
  radius: number;
  velocity: THREE.Vector3;
  kind: 'hazard' | 'target' | 'ring';
  scored?: boolean;
};

const MODE_META: Record<
  ArcadeGameId,
  {
    accent: number;
    secondary: number;
    camera: THREE.Vector3;
    lookAt: THREE.Vector3;
    baseSpeed: number;
    statLabel: string;
  }
> = {
  'space-dodge': {
    accent: 0xa78bfa,
    secondary: 0x22d3ee,
    camera: new THREE.Vector3(0, 3.2, 10),
    lookAt: new THREE.Vector3(0, 0.4, -12),
    baseSpeed: 10,
    statLabel: 'Escudos'
  },
  'arena-ball': {
    accent: 0x72f59f,
    secondary: 0xfbbf24,
    camera: new THREE.Vector3(0, 10, 9),
    lookAt: new THREE.Vector3(0, 0, 0),
    baseSpeed: 7,
    statLabel: 'Orbes'
  },
  'neon-flight': {
    accent: 0xff4fb8,
    secondary: 0x22d3ee,
    camera: new THREE.Vector3(0, 2.8, 11),
    lookAt: new THREE.Vector3(0, 0.2, -16),
    baseSpeed: 11,
    statLabel: 'Aneis'
  }
};

export class Arcade3DGame {
  private readonly container: HTMLElement;
  private readonly options: ArcadeGameOptions;
  private readonly mode: (typeof MODE_META)[ArcadeGameId];
  private readonly scene = new THREE.Scene();
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly objects: MovingObject[] = [];
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(64, 1, 0.1, 180);
  private readonly player: THREE.Mesh;
  private readonly staticMeshes: THREE.Mesh[] = [];
  private resizeObserver?: ResizeObserver;
  private animationFrame = 0;
  private disposed = false;
  private state: ArcadeSnapshot['state'] = 'ready';
  private score = 0;
  private speed = 0;
  private statValue = 3;
  private spawnTimer = 0;
  private playerVelocity = new THREE.Vector3();

  constructor(container: HTMLElement, options: ArcadeGameOptions) {
    this.container = container;
    this.options = options;
    this.mode = MODE_META[options.id];
    this.speed = this.mode.baseSpeed;
    this.player = this.createPlayer();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.setupRenderer();
    this.setupScene();
    this.bindEvents();
    this.resize();
    this.emitUpdate();
    this.loop();
  }

  start() {
    if (this.state === 'ready') {
      this.state = 'running';
      this.clock.getDelta();
      this.emitUpdate();
    }
  }

  restart() {
    this.clearObjects();
    this.score = 0;
    this.speed = this.mode.baseSpeed;
    this.statValue = this.options.id === 'space-dodge' ? 3 : 0;
    this.spawnTimer = 0;
    this.playerVelocity.set(0, 0, 0);
    this.resetPlayer();
    this.state = 'running';
    this.clock.getDelta();
    this.emitUpdate();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.resizeObserver?.disconnect();
    this.clearObjects();
    this.staticMeshes.forEach((mesh) => this.disposeMesh(mesh));
    this.disposeMesh(this.player);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x070a12);
    this.scene.fog = new THREE.Fog(0x070a12, 18, 82);
    this.camera.position.copy(this.mode.camera);
    this.camera.lookAt(this.mode.lookAt);

    this.scene.add(new THREE.HemisphereLight(0xdff7ff, 0x070a12, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(6, 10, 7);
    key.castShadow = true;
    this.scene.add(key);

    const accentLight = new THREE.PointLight(this.mode.accent, 54, 46);
    accentLight.position.set(-5, 3.5, -10);
    this.scene.add(accentLight);

    this.scene.add(this.player);
    this.createWorld();
  }

  private createPlayer() {
    const material = new THREE.MeshStandardMaterial({
      color: this.mode.accent,
      emissive: this.mode.accent,
      emissiveIntensity: 0.36,
      metalness: 0.32,
      roughness: 0.25
    });

    const geometry =
      this.options.id === 'arena-ball'
        ? new THREE.SphereGeometry(0.55, 32, 20)
        : this.options.id === 'neon-flight'
          ? new THREE.ConeGeometry(0.62, 1.25, 4)
          : new THREE.ConeGeometry(0.58, 1.55, 5);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.resetPlayer(mesh);
    return mesh;
  }

  private resetPlayer(mesh = this.player) {
    if (this.options.id === 'arena-ball') {
      mesh.position.set(0, 0.55, 0);
      mesh.rotation.set(0, 0, 0);
      return;
    }

    mesh.position.set(0, 0, 2);
    mesh.rotation.set(Math.PI / 2, 0, 0);
  }

  private createWorld() {
    if (this.options.id === 'arena-ball') {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(11, 0.18, 11),
        new THREE.MeshStandardMaterial({ color: 0x122033, metalness: 0.18, roughness: 0.5 })
      );
      floor.position.y = -0.09;
      floor.receiveShadow = true;
      this.staticMeshes.push(floor);
      this.scene.add(floor);

      for (const [x, z, sx, sz] of [
        [0, -5.55, 11, 0.12],
        [0, 5.55, 11, 0.12],
        [-5.55, 0, 0.12, 11],
        [5.55, 0, 0.12, 11]
      ]) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(sx, 0.42, sz),
          new THREE.MeshStandardMaterial({
            color: this.mode.accent,
            emissive: this.mode.accent,
            emissiveIntensity: 0.32
          })
        );
        wall.position.set(x, 0.12, z);
        this.staticMeshes.push(wall);
        this.scene.add(wall);
      }
      this.spawnTarget();
      for (let i = 0; i < 3; i += 1) this.spawnArenaHazard();
      return;
    }

    const grid = new THREE.GridHelper(28, 28, this.mode.accent, 0x273449);
    grid.position.z = -20;
    grid.position.y = -2.25;
    this.scene.add(grid);

    const tunnel = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.08, 90),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        emissive: 0x020617,
        metalness: 0.12,
        roughness: 0.65
      })
    );
    tunnel.position.set(0, -2.35, -31);
    tunnel.receiveShadow = true;
    this.staticMeshes.push(tunnel);
    this.scene.add(tunnel);
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' '].includes(key)) {
      event.preventDefault();
    }

    if (key === 'enter' && this.state !== 'running') {
      this.restart();
      return;
    }

    if (this.state === 'ready') {
      this.start();
    }

    this.keys.add(key);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private resize() {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private loop = () => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.04);

    if (this.state === 'running') {
      this.update(delta);
    } else {
      this.player.rotation.y += delta * 0.75;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.score += delta * this.speed * 6;
    this.speed = Math.min(this.mode.baseSpeed + 12, this.mode.baseSpeed + this.score / 360);

    if (this.options.id === 'arena-ball') {
      this.updateArena(delta);
    } else {
      this.updateFlight(delta);
    }

    this.emitUpdate();
  }

  private updateFlight(delta: number) {
    const inputX = this.input('d', 'arrowright') - this.input('a', 'arrowleft');
    const inputY = this.input('w', 'arrowup') - this.input('s', 'arrowdown');
    const boost = this.keys.has(' ') ? 1.28 : 1;
    this.speed = Math.min(this.mode.baseSpeed + 15, this.speed * boost);

    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x + inputX * delta * 7.5, -4.6, 4.6);
    this.player.position.y = THREE.MathUtils.clamp(this.player.position.y + inputY * delta * 5.2, -1.7, 3.2);
    this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, -inputX * 0.62, delta * 8);
    this.player.rotation.x = THREE.MathUtils.lerp(this.player.rotation.x, Math.PI / 2 + inputY * 0.22, delta * 8);

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      if (this.options.id === 'space-dodge') this.spawnAsteroid();
      if (this.options.id === 'neon-flight') this.spawnRing();
      this.spawnTimer = this.options.id === 'space-dodge' ? Math.max(0.35, 0.92 - this.speed / 34) : 1.15;
    }

    for (let i = this.objects.length - 1; i >= 0; i -= 1) {
      const object = this.objects[i];
      object.mesh.position.addScaledVector(object.velocity, delta * this.speed);
      object.mesh.rotation.x += delta * 1.5;
      object.mesh.rotation.y += delta * 1.2;

      if (object.kind === 'ring') {
        this.scoreRing(object);
      } else if (this.distanceToPlayer(object.mesh.position) < object.radius + 0.55) {
        this.hitPlayer();
      }

      if (object.mesh.position.z > 12) {
        this.removeObject(i);
      }
    }
  }

  private updateArena(delta: number) {
    const inputX = this.input('d', 'arrowright') - this.input('a', 'arrowleft');
    const inputZ = this.input('s', 'arrowdown') - this.input('w', 'arrowup');
    const acceleration = this.keys.has(' ') ? 24 : 17;
    this.playerVelocity.x += inputX * acceleration * delta;
    this.playerVelocity.z += inputZ * acceleration * delta;
    this.playerVelocity.multiplyScalar(0.92);
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x + this.playerVelocity.x * delta, -4.85, 4.85);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z + this.playerVelocity.z * delta, -4.85, 4.85);
    this.player.rotation.x += this.playerVelocity.z * delta;
    this.player.rotation.z -= this.playerVelocity.x * delta;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.objects.filter((object) => object.kind === 'hazard').length < 6) {
      this.spawnArenaHazard();
      this.spawnTimer = Math.max(1.1, 2.4 - this.score / 240);
    }

    for (let i = this.objects.length - 1; i >= 0; i -= 1) {
      const object = this.objects[i];
      object.mesh.position.addScaledVector(object.velocity, delta);

      if (object.kind === 'hazard') {
        if (Math.abs(object.mesh.position.x) > 4.75) object.velocity.x *= -1;
        if (Math.abs(object.mesh.position.z) > 4.75) object.velocity.z *= -1;
        object.mesh.rotation.x += delta * 1.7;
        object.mesh.rotation.z += delta * 1.1;

        if (this.distanceToPlayer(object.mesh.position) < object.radius + 0.55) {
          this.hitPlayer();
        }
      } else if (this.distanceToPlayer(object.mesh.position) < object.radius + 0.62) {
        this.score += 120;
        this.statValue += 1;
        this.removeObject(i);
        this.spawnTarget();
      }
    }
  }

  private input(primary: string, secondary: string) {
    return this.keys.has(primary) || this.keys.has(secondary) ? 1 : 0;
  }

  private spawnAsteroid() {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.48 + Math.random() * 0.42, 1),
      new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        emissive: 0x4c1d95,
        emissiveIntensity: 0.25,
        roughness: 0.72
      })
    );
    mesh.position.set(THREE.MathUtils.randFloatSpread(8.6), THREE.MathUtils.randFloat(-1.4, 3), -58);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.objects.push({ mesh, radius: 0.72, velocity: new THREE.Vector3(0, 0, 1), kind: 'hazard' });
  }

  private spawnRing() {
    const geometry = new THREE.TorusGeometry(1.35, 0.11, 12, 40);
    const material = new THREE.MeshStandardMaterial({
      color: this.mode.accent,
      emissive: this.mode.accent,
      emissiveIntensity: 0.68,
      metalness: 0.25,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(THREE.MathUtils.randFloatSpread(6.2), THREE.MathUtils.randFloat(-0.8, 2.7), -60);
    mesh.rotation.y = Math.PI / 2;
    this.scene.add(mesh);
    this.objects.push({ mesh, radius: 1.45, velocity: new THREE.Vector3(0, 0, 1), kind: 'ring' });
  }

  private spawnTarget() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 24, 16),
      new THREE.MeshStandardMaterial({
        color: this.mode.secondary,
        emissive: this.mode.secondary,
        emissiveIntensity: 0.55,
        roughness: 0.18
      })
    );
    mesh.position.set(THREE.MathUtils.randFloat(-4.1, 4.1), 0.42, THREE.MathUtils.randFloat(-4.1, 4.1));
    this.scene.add(mesh);
    this.objects.push({ mesh, radius: 0.42, velocity: new THREE.Vector3(), kind: 'target' });
  }

  private spawnArenaHazard() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.72, 0.72),
      new THREE.MeshStandardMaterial({
        color: 0xff4f6d,
        emissive: 0xbe123c,
        emissiveIntensity: 0.5,
        roughness: 0.28
      })
    );
    mesh.position.set(THREE.MathUtils.randFloat(-4, 4), 0.48, THREE.MathUtils.randFloat(-4, 4));
    const velocity = new THREE.Vector3(THREE.MathUtils.randFloat(1.2, 2.8), 0, THREE.MathUtils.randFloat(1.2, 2.8));
    if (Math.random() > 0.5) velocity.x *= -1;
    if (Math.random() > 0.5) velocity.z *= -1;
    this.scene.add(mesh);
    this.objects.push({ mesh, radius: 0.55, velocity, kind: 'hazard' });
  }

  private scoreRing(object: MovingObject) {
    const dz = object.mesh.position.z - this.player.position.z;
    if (!object.scored && dz > 0.2) {
      const dx = this.player.position.x - object.mesh.position.x;
      const dy = this.player.position.y - object.mesh.position.y;
      const centerDistance = Math.hypot(dx, dy);
      if (centerDistance < 1.08) {
        object.scored = true;
        this.statValue += 1;
        this.score += 160;
      } else if (centerDistance < 1.72) {
        this.hitPlayer();
      }
    }
  }

  private hitPlayer() {
    if (this.options.id === 'space-dodge' && this.statValue > 1) {
      this.statValue -= 1;
      this.score = Math.max(0, this.score - 80);
      this.player.position.x *= -0.35;
      return;
    }

    this.state = 'gameover';
    this.emitUpdate();
  }

  private distanceToPlayer(position: THREE.Vector3) {
    return this.player.position.distanceTo(position);
  }

  private removeObject(index: number) {
    const [object] = this.objects.splice(index, 1);
    this.scene.remove(object.mesh);
    this.disposeMesh(object.mesh);
  }

  private clearObjects() {
    for (const object of this.objects) {
      this.scene.remove(object.mesh);
      this.disposeMesh(object.mesh);
    }
    this.objects.length = 0;

    if (this.options.id === 'arena-ball') {
      this.spawnTarget();
      for (let i = 0; i < 3; i += 1) this.spawnArenaHazard();
    }
  }

  private snapshot(): ArcadeSnapshot {
    return {
      score: Math.floor(this.score),
      speed: Number(this.speed.toFixed(1)),
      state: this.state,
      statLabel: this.mode.statLabel,
      statValue: this.statValue
    };
  }

  private emitUpdate() {
    this.options.onUpdate?.(this.snapshot());
  }

  private disposeMesh(mesh: THREE.Mesh) {
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
  }
}
