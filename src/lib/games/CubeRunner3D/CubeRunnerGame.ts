import * as THREE from 'three';
import type { CubeRunnerOptions, CubeRunnerSnapshot } from './types';

type Obstacle = {
  mesh: THREE.Mesh;
  lane: number;
  passed: boolean;
};

const LANES = [-2.4, 0, 2.4];
const PLAYER_SIZE = 1;

export class CubeRunnerGame {
  private readonly container: HTMLElement;
  private readonly options: CubeRunnerOptions;
  private readonly scene = new THREE.Scene();
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly obstacles: Obstacle[] = [];
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly player: THREE.Mesh;
  private readonly trackSegments: THREE.Mesh[] = [];
  private animationFrame = 0;
  private resizeObserver?: ResizeObserver;
  private state: CubeRunnerSnapshot['state'] = 'ready';
  private score = 0;
  private speed = 10;
  private currentLane = 1;
  private targetX = LANES[1];
  private verticalVelocity = 0;
  private spawnTimer = 0;
  private disposed = false;
  private touchMove = 0;
  private touchJump = false;

  constructor(container: HTMLElement, options: CubeRunnerOptions = {}) {
    this.container = container;
    this.options = options;
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 180);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.player = this.createPlayer();

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
    this.clearObstacles();
    this.score = 0;
    this.speed = 10;
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.verticalVelocity = 0;
    this.spawnTimer = 0;
    this.player.position.set(0, PLAYER_SIZE / 2, 2);
    this.state = 'running';
    this.clock.getDelta();
    this.emitUpdate();
  }

  setTouchControls(next: { move?: number; jump?: boolean }) {
    this.touchMove = next.move ?? this.touchMove;
    this.touchJump = next.jump ?? this.touchJump;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.resizeObserver?.disconnect();
    this.clearObstacles();

    for (const segment of this.trackSegments) {
      this.disposeMesh(segment);
    }

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
    this.scene.fog = new THREE.Fog(0x070a12, 14, 70);

    const ambient = new THREE.HemisphereLight(0xc7f9ff, 0x101521, 1.45);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(8, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const backLight = new THREE.PointLight(0xff4fb8, 42, 36);
    backLight.position.set(-5, 5, -16);
    this.scene.add(backLight);

    this.camera.position.set(0, 5.1, 9.5);
    this.camera.lookAt(0, 0.6, -9);

    this.scene.add(this.player);
    this.createTrack();
  }

  private createPlayer() {
    const geometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    const material = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0e7490,
      emissiveIntensity: 0.5,
      metalness: 0.35,
      roughness: 0.28
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, PLAYER_SIZE / 2, 2);
    mesh.castShadow = true;
    return mesh;
  }

  private createTrack() {
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x172033,
      metalness: 0.2,
      roughness: 0.5
    });

    for (let i = 0; i < 7; i += 1) {
      const segment = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.16, 18), trackMaterial.clone());
      segment.position.set(0, -0.08, -i * 18 + 8);
      segment.receiveShadow = true;
      this.trackSegments.push(segment);
      this.scene.add(segment);
    }

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0891b2,
      emissiveIntensity: 0.45
    });

    for (const x of [-4.6, 4.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 126), railMaterial.clone());
      rail.position.set(x, 0.08, -46);
      this.trackSegments.push(rail);
      this.scene.add(rail);
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd', ' '].includes(key)) {
      event.preventDefault();
    }

    if (key === 'enter' && this.state !== 'running') {
      this.restart();
      return;
    }

    if (this.state === 'ready') {
      this.start();
    }

    if (this.state !== 'running') {
      return;
    }

    if ((key === 'arrowleft' || key === 'a') && !this.keys.has(key)) {
      this.currentLane = Math.max(0, this.currentLane - 1);
      this.targetX = LANES[this.currentLane];
    }

    if ((key === 'arrowright' || key === 'd') && !this.keys.has(key)) {
      this.currentLane = Math.min(LANES.length - 1, this.currentLane + 1);
      this.targetX = LANES[this.currentLane];
    }

    if (key === ' ' && this.player.position.y <= PLAYER_SIZE / 2 + 0.04) {
      this.verticalVelocity = 8.2;
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
    if (this.disposed) {
      return;
    }

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.04);

    if (this.state === 'running') {
      this.update(delta);
    } else {
      this.player.rotation.y += delta * 0.7;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.score += delta * this.speed * 8;
    this.speed = Math.min(24, 10 + this.score / 260);
    this.spawnTimer -= delta;

    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = Math.max(0.42, 1.1 - this.speed / 32 + Math.random() * 0.32);
    }

    if (this.touchMove < -0.35) {
      this.currentLane = Math.max(0, this.currentLane - 1);
      this.targetX = LANES[this.currentLane];
      this.touchMove = 0;
    }
    if (this.touchMove > 0.35) {
      this.currentLane = Math.min(LANES.length - 1, this.currentLane + 1);
      this.targetX = LANES[this.currentLane];
      this.touchMove = 0;
    }
    if (this.touchJump && this.player.position.y <= PLAYER_SIZE / 2 + 0.04) {
      this.verticalVelocity = 8.2;
    }

    this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, this.targetX, delta * 12);
    this.player.position.y += this.verticalVelocity * delta;
    this.verticalVelocity -= 19 * delta;

    if (this.player.position.y < PLAYER_SIZE / 2) {
      this.player.position.y = PLAYER_SIZE / 2;
      this.verticalVelocity = 0;
    }

    this.player.rotation.x -= delta * (this.speed * 0.32);
    this.moveTrack(delta);
    this.moveObstacles(delta);
    this.emitUpdate();
  }

  private moveTrack(delta: number) {
    for (const segment of this.trackSegments) {
      segment.position.z += this.speed * delta;
      if (segment.geometry instanceof THREE.BoxGeometry && segment.position.z > 24) {
        segment.position.z -= 126;
      }
    }
  }

  private spawnObstacle() {
    const lane = Math.floor(Math.random() * LANES.length);
    const geometry = new THREE.BoxGeometry(1.15, 1.15, 1.15);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4fb8,
      emissive: 0xbe185d,
      emissiveIntensity: 0.42,
      metalness: 0.24,
      roughness: 0.34
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(LANES[lane], 0.58, -54);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.obstacles.push({ mesh, lane, passed: false });
  }

  private moveObstacles(delta: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacles[i];
      obstacle.mesh.position.z += this.speed * delta;
      obstacle.mesh.rotation.x += delta * 1.8;
      obstacle.mesh.rotation.y += delta * 1.2;

      if (!obstacle.passed && obstacle.mesh.position.z > this.player.position.z + 1.2) {
        obstacle.passed = true;
        this.score += 18;
      }

      if (this.collidesWithPlayer(obstacle)) {
        this.endGame();
      }

      if (obstacle.mesh.position.z > 14) {
        this.scene.remove(obstacle.mesh);
        this.disposeMesh(obstacle.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private collidesWithPlayer(obstacle: Obstacle) {
    const dx = Math.abs(this.player.position.x - obstacle.mesh.position.x);
    const dz = Math.abs(this.player.position.z - obstacle.mesh.position.z);
    const dy = Math.abs(this.player.position.y - obstacle.mesh.position.y);
    return dx < 0.86 && dz < 0.92 && dy < 0.86;
  }

  private endGame() {
    this.state = 'gameover';
    const snapshot = this.snapshot();
    this.options.onGameOver?.(snapshot);
    this.options.onUpdate?.(snapshot);
  }

  private clearObstacles() {
    for (const obstacle of this.obstacles) {
      this.scene.remove(obstacle.mesh);
      this.disposeMesh(obstacle.mesh);
    }
    this.obstacles.length = 0;
  }

  private emitUpdate() {
    this.options.onUpdate?.(this.snapshot());
  }

  private snapshot(): CubeRunnerSnapshot {
    return {
      score: Math.floor(this.score),
      speed: Number(this.speed.toFixed(1)),
      state: this.state
    };
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
