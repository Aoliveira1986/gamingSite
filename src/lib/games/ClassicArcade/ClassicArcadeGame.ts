import type { ClassicGameId, ClassicGameOptions, ClassicSnapshot } from './types';

type Brick = { x: number; y: number; w: number; h: number; hp: number; color: string };
type Enemy = { x: number; y: number; w: number; h: number; alive: boolean; phase: number };
type Shot = { x: number; y: number; vy: number; from: 'player' | 'enemy' };
type Platform = { x: number; y: number; w: number; h: number };
type Coin = { x: number; y: number; taken: boolean };
type Walker = { x: number; y: number; w: number; h: number; vx: number; alive: boolean };
type Cell = { x: number; y: number };
type Direction = 'left' | 'right' | 'up' | 'down';
type TetrisPiece = { matrix: number[][]; x: number; y: number; color: string };
type Agent = { x: number; y: number; angle: number; speed: number; alive: boolean; turnTimer: number };
type IntelBox = { x: number; y: number; taken: boolean };

const PALETTE: Record<ClassicGameId, { accent: string; secondary: string; danger: string }> = {
	'brick-breaker-100': { accent: '#22d3ee', secondary: '#72f59f', danger: '#ff4fb8' },
	'space-invaders-100': { accent: '#a78bfa', secondary: '#22d3ee', danger: '#fb7185' },
	'super-platformer': { accent: '#fbbf24', secondary: '#72f59f', danger: '#ff4fb8' },
	'snake-100': { accent: '#72f59f', secondary: '#22d3ee', danger: '#fb7185' },
	'tetris-100': { accent: '#a78bfa', secondary: '#fbbf24', danger: '#fb7185' },
	'shadow-agent': { accent: '#ff4fb8', secondary: '#22d3ee', danger: '#fb7185' }
};

const TETRIS_SHAPES: number[][][] = [
	[[1, 1, 1, 1]],
	[
		[1, 1],
		[1, 1]
	],
	[
		[0, 1, 0],
		[1, 1, 1]
	],
	[
		[1, 0, 0],
		[1, 1, 1]
	],
	[
		[0, 0, 1],
		[1, 1, 1]
	],
	[
		[0, 1, 1],
		[1, 1, 0]
	],
	[
		[1, 1, 0],
		[0, 1, 1]
	]
];

export class ClassicArcadeGame {
	private readonly container: HTMLElement;
	private readonly options: ClassicGameOptions;
	private readonly canvas = document.createElement('canvas');
	private readonly ctx = this.canvas.getContext('2d');
	private readonly keys = new Set<string>();
	private readonly palette: (typeof PALETTE)[ClassicGameId];
	private resizeObserver?: ResizeObserver;
	private frame = 0;
	private disposed = false;
	private state: ClassicSnapshot['state'] = 'ready';
	private score = 0;
	private level = 1;
	private speed = 1;
	private width = 960;
	private height = 640;
	private lastTime = 0;
	private safeTimer = 0;
	private pointerX: number | null = null;
	private touchMove = 0;
	private touchMoveY = 0;
	private touchJump = false;
	private touchFire = false;

	private paddle = { x: 420, y: 590, w: 130, h: 16 };
	private ball = { x: 480, y: 520, r: 9, vx: 260, vy: -280 };
	private bricks: Brick[] = [];

	private invaderPlayer = { x: 460, y: 585, w: 48, h: 20, cooldown: 0 };
	private enemies: Enemy[] = [];
	private shots: Shot[] = [];
	private enemyDirection = 1;
	private enemyStepTimer = 0;

	private hero = { x: 60, y: 420, w: 34, h: 46, vx: 0, vy: 0, grounded: false };
	private cameraX = 0;
	private platforms: Platform[] = [];
	private coins: Coin[] = [];
	private walkers: Walker[] = [];
	private flagX = 1800;

	private snake: Cell[] = [];
	private snakeFood: Cell = { x: 12, y: 9 };
	private snakeDirection: Direction = 'right';
	private nextSnakeDirection: Direction = 'right';
	private snakeTimer = 0;
	private snakeEaten = 0;

	private tetrisBoard: string[][] = [];
	private tetrisPiece: TetrisPiece | null = null;
	private tetrisFallTimer = 0;
	private tetrisMoveTimer = 0;
	private tetrisRotateReady = true;
	private tetrisLines = 0;

	private assassin = { x: 90, y: 420, r: 13, speed: 245 };
	private agents: Agent[] = [];
	private intelBoxes: IntelBox[] = [];
	private exitZone = { x: 840, y: 320, r: 32 };
	private stealthDash = 0;
	private stealthCaughtTimer = 0;

	constructor(container: HTMLElement, options: ClassicGameOptions) {
		if (!this.ctx) throw new Error('Canvas 2D is not available');
		this.container = container;
		this.options = options;
		this.palette = PALETTE[options.id];
		this.canvas.tabIndex = 0;
		this.canvas.setAttribute('aria-label', options.id);
		this.container.appendChild(this.canvas);
		this.bindEvents();
		this.resize();
		this.resetMode();
		this.emitUpdate();
		this.frame = requestAnimationFrame(this.loop);
	}

	start() {
		if (this.state === 'ready') {
			this.state = 'running';
			this.safeTimer = 1.2;
			this.lastTime = performance.now();
			this.emitUpdate();
			this.canvas.focus({ preventScroll: true });
		}
	}

	setTouchControls(next: { move?: number; moveX?: number; moveY?: number; jump?: boolean; fire?: boolean; action?: boolean }) {
		this.touchMove = next.move ?? this.touchMove;
		this.touchMove = next.moveX ?? this.touchMove;
		this.touchMoveY = next.moveY ?? this.touchMoveY;
		this.touchJump = next.jump ?? this.touchJump;
		this.touchFire = next.fire ?? next.action ?? this.touchFire;
	}

	restart() {
		this.score = 0;
		this.level = 1;
		this.state = 'running';
		this.safeTimer = 1.2;
		this.lastTime = performance.now();
		this.resetMode();
		this.emitUpdate();
		this.canvas.focus({ preventScroll: true });
	}

	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		this.canvas.removeEventListener('pointermove', this.handlePointerMove);
		this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
		this.resizeObserver?.disconnect();
		this.canvas.remove();
	}

	private bindEvents() {
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		this.canvas.addEventListener('pointermove', this.handlePointerMove);
		this.canvas.addEventListener('pointerdown', this.handlePointerDown);
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
		if (this.state === 'ready') this.start();
		this.keys.add(key);
	};

	private handleKeyUp = (event: KeyboardEvent) => {
		this.keys.delete(event.key.toLowerCase());
	};

	private handlePointerMove = (event: PointerEvent) => {
		const rect = this.canvas.getBoundingClientRect();
		this.pointerX = event.clientX - rect.left;
	};

	private handlePointerDown = (event: PointerEvent) => {
		event.preventDefault();
		this.handlePointerMove(event);

		if (this.state !== 'running') {
			this.restart();
			return;
		}

		if (this.options.id === 'space-invaders-100') this.fireInvaderShot();
		if (this.options.id === 'tetris-100') this.rotateTetrisPiece();
		if (this.options.id === 'super-platformer' && this.hero.grounded) {
			this.hero.vy = -510;
			this.hero.grounded = false;
		}
	};

	private resize() {
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const rect = this.container.getBoundingClientRect();
		this.width = Math.max(320, Math.floor(rect.width));
		this.height = Math.max(420, Math.floor(rect.height));
		this.canvas.width = Math.floor(this.width * ratio);
		this.canvas.height = Math.floor(this.height * ratio);
		this.canvas.style.width = `${this.width}px`;
		this.canvas.style.height = `${this.height}px`;
		this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
		this.paddle.y = this.height - 58;
		this.invaderPlayer.y = this.height - 64;
		this.exitZone.x = this.width - 92;
		this.exitZone.y = this.height / 2;
	}

	private loop = (time: number) => {
		if (this.disposed) return;
		const delta = Math.min((time - (this.lastTime || time)) / 1000, 0.034);
		this.lastTime = time;
		if (this.state === 'running') this.update(delta);
		this.draw();
		this.frame = requestAnimationFrame(this.loop);
	};

	private resetMode() {
		this.speed = 1 + (this.level - 1) * 0.025;
		if (this.options.id === 'brick-breaker-100') this.resetBreaker();
		if (this.options.id === 'space-invaders-100') this.resetInvaders();
		if (this.options.id === 'super-platformer') this.resetPlatformer();
		if (this.options.id === 'snake-100') this.resetSnake();
		if (this.options.id === 'tetris-100') this.resetTetris();
		if (this.options.id === 'shadow-agent') this.resetShadowAgent();
	}

	private nextLevel() {
		if (this.level >= 100) {
			this.state = 'gameover';
			this.score += 5000;
			this.emitUpdate();
			return;
		}
		this.level += 1;
		this.resetMode();
		this.emitUpdate();
	}

	private update(delta: number) {
		this.safeTimer = Math.max(0, this.safeTimer - delta);
		if (this.options.id === 'brick-breaker-100') this.updateBreaker(delta);
		if (this.options.id === 'space-invaders-100') this.updateInvaders(delta);
		if (this.options.id === 'super-platformer') this.updatePlatformer(delta);
		if (this.options.id === 'snake-100') this.updateSnake(delta);
		if (this.options.id === 'tetris-100') this.updateTetris(delta);
		if (this.options.id === 'shadow-agent') this.updateShadowAgent(delta);
		this.emitUpdate();
	}

	private resetBreaker() {
		const cols = Math.min(14, 8 + Math.floor(this.level / 10));
		const rows = Math.min(9, 4 + Math.floor(this.level / 13));
		const gap = 8;
		const top = 88;
		const side = 34;
		const w = (this.width - side * 2 - gap * (cols - 1)) / cols;
		this.bricks = [];
		for (let row = 0; row < rows; row += 1) {
			for (let col = 0; col < cols; col += 1) {
				this.bricks.push({
					x: side + col * (w + gap),
					y: top + row * 26,
					w,
					h: 18,
					hp: 1 + Math.floor((this.level + row) / 30),
					color: row % 2 ? this.palette.secondary : this.palette.accent
				});
			}
		}
		this.paddle.w = Math.max(72, 150 - this.level * 0.75);
		this.paddle.x = (this.width - this.paddle.w) / 2;
		this.ball.x = this.width / 2;
		this.ball.y = this.height - 100;
		this.ball.vx = (230 + this.level * 3) * (Math.random() > 0.5 ? 1 : -1);
		this.ball.vy = -(270 + this.level * 4);
	}

	private updateBreaker(delta: number) {
		const move = this.touchMove || this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		if (this.pointerX !== null) {
			this.paddle.x = clamp(this.pointerX - this.paddle.w / 2, 10, this.width - this.paddle.w - 10);
		} else {
			this.paddle.x = clamp(this.paddle.x + move * delta * 620, 10, this.width - this.paddle.w - 10);
		}
		this.ball.x += this.ball.vx * delta;
		this.ball.y += this.ball.vy * delta;

		if (this.ball.x < this.ball.r || this.ball.x > this.width - this.ball.r) this.ball.vx *= -1;
		if (this.ball.y < 54) this.ball.vy = Math.abs(this.ball.vy);
		if (this.ball.y > this.height + 30 && this.safeTimer <= 0) {
			this.state = 'gameover';
			return;
		}

		if (
			this.ball.y + this.ball.r >= this.paddle.y &&
			this.ball.y - this.ball.r <= this.paddle.y + this.paddle.h &&
			this.ball.x >= this.paddle.x &&
			this.ball.x <= this.paddle.x + this.paddle.w &&
			this.ball.vy > 0
		) {
			const hit = (this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
			this.ball.vx = hit * (340 + this.level * 4);
			this.ball.vy = -(310 + this.level * 4);
		}

		for (let i = this.bricks.length - 1; i >= 0; i -= 1) {
			const brick = this.bricks[i];
			if (circleRect(this.ball.x, this.ball.y, this.ball.r, brick)) {
				brick.hp -= 1;
				this.ball.vy *= -1;
				this.score += 10 * this.level;
				if (brick.hp <= 0) this.bricks.splice(i, 1);
				break;
			}
		}
		if (this.bricks.length === 0) this.nextLevel();
	}

	private resetInvaders() {
		this.enemies = [];
		this.shots = [];
		const rows = Math.min(7, 3 + Math.floor(this.level / 18));
		const cols = Math.min(12, 7 + Math.floor(this.level / 12));
		for (let row = 0; row < rows; row += 1) {
			for (let col = 0; col < cols; col += 1) {
				this.enemies.push({
					x: 90 + col * 58,
					y: 92 + row * 42,
					w: 34,
					h: 24,
					alive: true,
					phase: Math.random() * Math.PI * 2
				});
			}
		}
		this.enemyDirection = 1;
		this.enemyStepTimer = 0;
		this.invaderPlayer.x = this.width / 2 - this.invaderPlayer.w / 2;
		this.invaderPlayer.cooldown = 0;
	}

	private updateInvaders(delta: number) {
		const move = this.touchMove || this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		if (this.pointerX !== null) {
			this.invaderPlayer.x = clamp(this.pointerX - this.invaderPlayer.w / 2, 12, this.width - this.invaderPlayer.w - 12);
		} else {
			this.invaderPlayer.x = clamp(this.invaderPlayer.x + move * delta * 410, 12, this.width - this.invaderPlayer.w - 12);
		}
		this.invaderPlayer.cooldown -= delta;
		if ((this.keys.has(' ') || this.touchFire) && this.invaderPlayer.cooldown <= 0) {
			this.fireInvaderShot();
		}

		const living = this.enemies.filter((enemy) => enemy.alive);
		const enemySpeed = 34 + this.level * 2.6;
		let edge = false;
		for (const enemy of living) {
			enemy.x += this.enemyDirection * enemySpeed * delta;
			if (enemy.x < 16 || enemy.x + enemy.w > this.width - 16) edge = true;
			if (enemy.y + enemy.h > this.invaderPlayer.y - 10 && this.safeTimer <= 0) this.state = 'gameover';
		}
		if (edge) {
			this.enemyDirection *= -1;
			living.forEach((enemy) => (enemy.y += 18));
		}

		this.enemyStepTimer -= delta;
		if (living.length && this.enemyStepTimer <= 0) {
			const shooter = living[Math.floor(Math.random() * living.length)];
			this.shots.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h, vy: 210 + this.level * 4, from: 'enemy' });
			this.enemyStepTimer = Math.max(0.16, 1.1 - this.level * 0.008);
		}

		for (let i = this.shots.length - 1; i >= 0; i -= 1) {
			const shot = this.shots[i];
			shot.y += shot.vy * delta;
			if (shot.y < 48 || shot.y > this.height + 20) {
				this.shots.splice(i, 1);
				continue;
			}
			if (shot.from === 'player') {
				const hit = this.enemies.find((enemy) => enemy.alive && pointRect(shot.x, shot.y, enemy));
				if (hit) {
					hit.alive = false;
					this.score += 25 * this.level;
					this.shots.splice(i, 1);
				}
			} else if (pointRect(shot.x, shot.y, this.invaderPlayer) && this.safeTimer <= 0) {
				this.state = 'gameover';
			}
		}
		if (this.enemies.every((enemy) => !enemy.alive)) this.nextLevel();
	}

	private resetPlatformer() {
		this.hero = { x: 60, y: this.height - 118, w: 34, h: 46, vx: 0, vy: 0, grounded: false };
		this.cameraX = 0;
		this.flagX = 1400 + this.level * 18;
		this.platforms = [{ x: 0, y: this.height - 54, w: this.flagX + 500, h: 54 }];
		this.coins = [];
		this.walkers = [];
		for (let i = 0; i < 12 + Math.floor(this.level / 8); i += 1) {
			const x = 220 + i * 150 + (i % 2) * 34;
			const y = this.height - 130 - (i % 3) * 42;
			this.platforms.push({ x, y, w: 105, h: 18 });
			this.coins.push({ x: x + 45, y: y - 28, taken: false });
			if (i % 3 === 1) this.walkers.push({ x: x + 15, y: this.height - 88, w: 30, h: 30, vx: 42 + this.level * 0.8, alive: true });
		}
	}

	private fireInvaderShot() {
		if (this.invaderPlayer.cooldown > 0) return;
		this.shots.push({
			x: this.invaderPlayer.x + this.invaderPlayer.w / 2,
			y: this.invaderPlayer.y,
			vy: -560,
			from: 'player'
		});
		this.invaderPlayer.cooldown = Math.max(0.12, 0.28 - this.level * 0.001);
	}

	private updatePlatformer(delta: number) {
		const move = this.touchMove || this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		this.hero.vx = move * (230 + this.level * 0.8);
		if ((this.touchJump || this.keys.has(' ') || this.keys.has('w') || this.keys.has('arrowup')) && this.hero.grounded) {
			this.hero.vy = -510;
			this.hero.grounded = false;
		}
		this.hero.vy += 1120 * delta;
		this.hero.x += this.hero.vx * delta;
		this.hero.y += this.hero.vy * delta;
		this.hero.grounded = false;
		for (const platform of this.platforms) {
			if (
				this.hero.x + this.hero.w > platform.x &&
				this.hero.x < platform.x + platform.w &&
				this.hero.y + this.hero.h > platform.y &&
				this.hero.y + this.hero.h < platform.y + platform.h + 24 &&
				this.hero.vy >= 0
			) {
				this.hero.y = platform.y - this.hero.h;
				this.hero.vy = 0;
				this.hero.grounded = true;
			}
		}
		this.hero.x = Math.max(0, this.hero.x);
		this.cameraX = clamp(this.hero.x - this.width * 0.34, 0, this.flagX - this.width + 420);
		if (this.hero.y > this.height + 120 && this.safeTimer <= 0) this.state = 'gameover';

		for (const coin of this.coins) {
			if (!coin.taken && rectsOverlap(this.hero, { x: coin.x - 10, y: coin.y - 10, w: 20, h: 20 })) {
				coin.taken = true;
				this.score += 50 * this.level;
			}
		}

		for (const walker of this.walkers) {
			if (!walker.alive) continue;
			walker.x += walker.vx * delta;
			const leftLimit = Math.floor(walker.x / 450) * 450 + 80;
			const rightLimit = leftLimit + 330;
			if (walker.x < leftLimit || walker.x > rightLimit) walker.vx *= -1;
			if (rectsOverlap(this.hero, walker)) {
				if (this.hero.vy > 80 && this.hero.y + this.hero.h < walker.y + 14) {
					walker.alive = false;
					this.hero.vy = -300;
					this.score += 100 * this.level;
				} else if (this.safeTimer <= 0) {
					this.state = 'gameover';
				}
			}
		}

		if (this.hero.x > this.flagX) {
			this.score += 400 * this.level;
			this.nextLevel();
		}
	}

	private resetSnake() {
		this.snake = [
			{ x: 8, y: 9 },
			{ x: 7, y: 9 },
			{ x: 6, y: 9 }
		];
		this.snakeDirection = 'right';
		this.nextSnakeDirection = 'right';
		this.snakeTimer = 0;
		this.snakeEaten = 0;
		this.placeSnakeFood();
	}

	private updateSnake(delta: number) {
		this.applySnakeDirection();
		this.snakeTimer += delta;
		const interval = Math.max(0.055, 0.18 - this.level * 0.0011);
		if (this.snakeTimer < interval) return;
		this.snakeTimer = 0;
		this.snakeDirection = this.nextSnakeDirection;

		const head = this.snake[0];
		const next = { x: head.x, y: head.y };
		if (this.snakeDirection === 'left') next.x -= 1;
		if (this.snakeDirection === 'right') next.x += 1;
		if (this.snakeDirection === 'up') next.y -= 1;
		if (this.snakeDirection === 'down') next.y += 1;

		const cols = this.snakeCols();
		const rows = this.snakeRows();
		if (
			next.x < 0 ||
			next.y < 0 ||
			next.x >= cols ||
			next.y >= rows ||
			this.snake.some((cell) => cell.x === next.x && cell.y === next.y)
		) {
			this.state = 'gameover';
			return;
		}

		this.snake.unshift(next);
		if (next.x === this.snakeFood.x && next.y === this.snakeFood.y) {
			this.score += 75 * this.level;
			this.snakeEaten += 1;
			if (this.snakeEaten >= 5) {
				this.score += 250 * this.level;
				this.nextLevel();
				return;
			}
			this.placeSnakeFood();
		} else {
			this.snake.pop();
		}
	}

	private applySnakeDirection() {
		let desired: Direction | null = null;
		if (this.keys.has('a') || this.keys.has('arrowleft') || this.touchMove < 0) desired = 'left';
		if (this.keys.has('d') || this.keys.has('arrowright') || this.touchMove > 0) desired = 'right';
		if (this.keys.has('w') || this.keys.has('arrowup') || this.touchMoveY > 0) desired = 'up';
		if (this.keys.has('s') || this.keys.has('arrowdown') || this.touchMoveY < 0) desired = 'down';
		if (!desired || this.isOppositeDirection(desired, this.snakeDirection)) return;
		this.nextSnakeDirection = desired;
	}

	private isOppositeDirection(next: Direction, current: Direction) {
		return (
			(next === 'left' && current === 'right') ||
			(next === 'right' && current === 'left') ||
			(next === 'up' && current === 'down') ||
			(next === 'down' && current === 'up')
		);
	}

	private placeSnakeFood() {
		const cols = this.snakeCols();
		const rows = this.snakeRows();
		do {
			this.snakeFood = {
				x: Math.floor(Math.random() * cols),
				y: Math.floor(Math.random() * rows)
			};
		} while (this.snake.some((cell) => cell.x === this.snakeFood.x && cell.y === this.snakeFood.y));
	}

	private snakeCols() {
		return Math.max(18, Math.floor(this.width / 28));
	}

	private snakeRows() {
		return Math.max(14, Math.floor((this.height - 80) / 28));
	}

	private resetTetris() {
		this.tetrisBoard = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => ''));
		this.tetrisLines = 0;
		this.tetrisFallTimer = 0;
		this.tetrisMoveTimer = 0;
		this.tetrisRotateReady = true;
		this.spawnTetrisPiece();
	}

	private updateTetris(delta: number) {
		this.tetrisMoveTimer -= delta;
		const horizontal = this.touchMove || this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		if (horizontal !== 0 && this.tetrisMoveTimer <= 0) {
			this.moveTetrisPiece(horizontal > 0 ? 1 : -1, 0);
			this.tetrisMoveTimer = 0.11;
		}

		if ((this.keys.has('w') || this.keys.has('arrowup') || this.touchFire) && this.tetrisRotateReady) {
			this.rotateTetrisPiece();
			this.tetrisRotateReady = false;
		}
		if (!this.keys.has('w') && !this.keys.has('arrowup') && !this.touchFire) this.tetrisRotateReady = true;

		const dropHeld = this.keys.has('s') || this.keys.has('arrowdown') || this.touchMoveY < 0;
		this.tetrisFallTimer += delta;
		const interval = dropHeld ? 0.045 : Math.max(0.08, 0.7 - this.level * 0.0055);
		if (this.tetrisFallTimer >= interval) {
			this.tetrisFallTimer = 0;
			if (!this.moveTetrisPiece(0, 1)) this.lockTetrisPiece();
		}
	}

	private spawnTetrisPiece() {
		const matrix = cloneMatrix(TETRIS_SHAPES[Math.floor(Math.random() * TETRIS_SHAPES.length)]);
		this.tetrisPiece = {
			matrix,
			x: Math.floor(5 - matrix[0].length / 2),
			y: 0,
			color: Math.random() > 0.5 ? this.palette.accent : this.palette.secondary
		};
		if (this.collidesTetris(this.tetrisPiece, 0, 0)) this.state = 'gameover';
	}

	private moveTetrisPiece(dx: number, dy: number) {
		if (!this.tetrisPiece || this.collidesTetris(this.tetrisPiece, dx, dy)) return false;
		this.tetrisPiece.x += dx;
		this.tetrisPiece.y += dy;
		return true;
	}

	private rotateTetrisPiece() {
		if (!this.tetrisPiece) return;
		const next = rotateMatrix(this.tetrisPiece.matrix);
		const candidate = { ...this.tetrisPiece, matrix: next };
		if (!this.collidesTetris(candidate, 0, 0)) {
			this.tetrisPiece.matrix = next;
			return;
		}
		if (!this.collidesTetris(candidate, -1, 0)) {
			this.tetrisPiece.matrix = next;
			this.tetrisPiece.x -= 1;
			return;
		}
		if (!this.collidesTetris(candidate, 1, 0)) {
			this.tetrisPiece.matrix = next;
			this.tetrisPiece.x += 1;
		}
	}

	private collidesTetris(piece: TetrisPiece, dx: number, dy: number) {
		for (let y = 0; y < piece.matrix.length; y += 1) {
			for (let x = 0; x < piece.matrix[y].length; x += 1) {
				if (!piece.matrix[y][x]) continue;
				const bx = piece.x + x + dx;
				const by = piece.y + y + dy;
				if (bx < 0 || bx >= 10 || by >= 20) return true;
				if (by >= 0 && this.tetrisBoard[by][bx]) return true;
			}
		}
		return false;
	}

	private lockTetrisPiece() {
		if (!this.tetrisPiece) return;
		for (let y = 0; y < this.tetrisPiece.matrix.length; y += 1) {
			for (let x = 0; x < this.tetrisPiece.matrix[y].length; x += 1) {
				if (!this.tetrisPiece.matrix[y][x]) continue;
				const bx = this.tetrisPiece.x + x;
				const by = this.tetrisPiece.y + y;
				if (by >= 0 && by < 20 && bx >= 0 && bx < 10) this.tetrisBoard[by][bx] = this.tetrisPiece.color;
			}
		}

		let cleared = 0;
		this.tetrisBoard = this.tetrisBoard.filter((row) => {
			if (row.every(Boolean)) {
				cleared += 1;
				return false;
			}
			return true;
		});
		while (this.tetrisBoard.length < 20) this.tetrisBoard.unshift(Array.from({ length: 10 }, () => ''));
		if (cleared > 0) {
			this.tetrisLines += cleared;
			this.score += cleared * cleared * 120 * this.level;
			if (this.tetrisLines >= 4 + Math.floor(this.level / 7)) this.nextLevel();
		}
		this.spawnTetrisPiece();
	}

	private resetShadowAgent() {
		this.assassin = { x: 86, y: this.height / 2, r: 13, speed: 245 + this.level };
		this.exitZone = { x: this.width - 78, y: this.height / 2, r: 32 };
		this.stealthDash = 0;
		this.stealthCaughtTimer = 0;
		const count = Math.min(12, 3 + Math.floor(this.level / 10));
		this.agents = [];
		this.intelBoxes = [];
		for (let i = 0; i < count; i += 1) {
			this.agents.push({
				x: 230 + (i % 4) * 145,
				y: 128 + Math.floor(i / 4) * 132,
				angle: i % 2 ? Math.PI : 0,
				speed: 34 + this.level * 0.65,
				alive: true,
				turnTimer: 1 + Math.random() * 2
			});
		}
		for (let i = 0; i < 4 + Math.floor(this.level / 18); i += 1) {
			this.intelBoxes.push({
				x: 270 + (i % 4) * 150,
				y: 94 + ((i * 2) % 5) * 92,
				taken: false
			});
		}
	}

	private updateShadowAgent(delta: number) {
		const moveX = this.touchMove || this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		const moveY = this.touchMoveY || this.input('w', 'arrowup') - this.input('s', 'arrowdown');
		const length = Math.hypot(moveX, moveY) || 1;
		const dash = this.keys.has(' ') || this.touchFire;
		this.stealthDash = Math.max(0, this.stealthDash - delta);
		const speed = this.assassin.speed * (dash && this.stealthDash <= 0 ? 1.55 : 1);
		if (dash && this.stealthDash <= 0) this.stealthDash = 0.36;
		this.assassin.x = clamp(this.assassin.x + (moveX / length) * speed * delta, 26, this.width - 26);
		this.assassin.y = clamp(this.assassin.y - (moveY / length) * speed * delta, 74, this.height - 28);

		for (const box of this.intelBoxes) {
			if (!box.taken && Math.hypot(this.assassin.x - box.x, this.assassin.y - box.y) < 30) {
				box.taken = true;
				this.score += 160 * this.level;
			}
		}

		let spotted = false;
		for (const agent of this.agents) {
			if (!agent.alive) continue;
			agent.turnTimer -= delta;
			if (agent.turnTimer <= 0) {
				agent.angle += (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.5;
				agent.turnTimer = Math.max(0.8, 2.3 - this.level * 0.01);
			}
			agent.x += Math.cos(agent.angle) * agent.speed * delta;
			agent.y += Math.sin(agent.angle) * agent.speed * delta;
			if (agent.x < 90 || agent.x > this.width - 120) agent.angle = Math.PI - agent.angle;
			if (agent.y < 92 || agent.y > this.height - 82) agent.angle = -agent.angle;
			agent.x = clamp(agent.x, 90, this.width - 120);
			agent.y = clamp(agent.y, 92, this.height - 82);

			const distance = Math.hypot(this.assassin.x - agent.x, this.assassin.y - agent.y);
			if (distance < 26) {
				const behind = Math.cos(agent.angle) * (this.assassin.x - agent.x) + Math.sin(agent.angle) * (this.assassin.y - agent.y) < -4;
				if (behind || dash) {
					agent.alive = false;
					this.score += 220 * this.level;
				} else if (this.safeTimer <= 0) {
					this.state = 'gameover';
				}
			} else if (this.agentSeesAssassin(agent) && this.safeTimer <= 0) {
				spotted = true;
				this.stealthCaughtTimer += delta;
				if (this.stealthCaughtTimer > 0.32) this.state = 'gameover';
			}
		}
		if (!spotted) this.stealthCaughtTimer = 0;

		if (
			this.intelBoxes.every((box) => box.taken) &&
			Math.hypot(this.assassin.x - this.exitZone.x, this.assassin.y - this.exitZone.y) < this.exitZone.r + this.assassin.r
		) {
			this.score += 450 * this.level;
			this.nextLevel();
		}
	}

	private agentSeesAssassin(agent: Agent) {
		const dx = this.assassin.x - agent.x;
		const dy = this.assassin.y - agent.y;
		const distance = Math.hypot(dx, dy);
		const range = 145 + this.level * 1.2;
		if (distance > range) return false;
		const angle = Math.atan2(dy, dx);
		const difference = Math.abs(normalizeAngle(angle - agent.angle));
		return difference < 0.38;
	}

	private draw() {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.clearRect(0, 0, this.width, this.height);
		this.drawBackground(ctx);
		if (this.options.id === 'brick-breaker-100') this.drawBreaker(ctx);
		if (this.options.id === 'space-invaders-100') this.drawInvaders(ctx);
		if (this.options.id === 'super-platformer') this.drawPlatformer(ctx);
		if (this.options.id === 'snake-100') this.drawSnake(ctx);
		if (this.options.id === 'tetris-100') this.drawTetris(ctx);
		if (this.options.id === 'shadow-agent') this.drawShadowAgent(ctx);
	}

	private drawBackground(ctx: CanvasRenderingContext2D) {
		const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
		gradient.addColorStop(0, '#08111f');
		gradient.addColorStop(1, '#070a12');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, this.width, this.height);
		ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
		for (let x = 0; x < this.width; x += 42) {
			ctx.beginPath();
			ctx.moveTo(x, 54);
			ctx.lineTo(x, this.height);
			ctx.stroke();
		}
	}

	private drawBreaker(ctx: CanvasRenderingContext2D) {
		this.bricks.forEach((brick) => {
			ctx.fillStyle = brick.color;
			roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 5);
			ctx.fill();
		});
		ctx.fillStyle = this.palette.accent;
		roundRect(ctx, this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 8);
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawInvaders(ctx: CanvasRenderingContext2D) {
		for (const enemy of this.enemies) {
			if (!enemy.alive) continue;
			ctx.fillStyle = this.palette.accent;
			roundRect(ctx, enemy.x, enemy.y + Math.sin(performance.now() / 180 + enemy.phase) * 2, enemy.w, enemy.h, 6);
			ctx.fill();
		}
		ctx.fillStyle = this.palette.secondary;
		roundRect(ctx, this.invaderPlayer.x, this.invaderPlayer.y, this.invaderPlayer.w, this.invaderPlayer.h, 5);
		ctx.fill();
		for (const shot of this.shots) {
			ctx.fillStyle = shot.from === 'player' ? this.palette.secondary : this.palette.danger;
			roundRect(ctx, shot.x - 2, shot.y - 10, 4, 16, 2);
			ctx.fill();
		}
	}

	private drawPlatformer(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.translate(-this.cameraX, 0);
		ctx.fillStyle = '#142033';
		this.platforms.forEach((platform) => {
			roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 6);
			ctx.fill();
		});
		ctx.fillStyle = this.palette.secondary;
		this.coins.forEach((coin) => {
			if (coin.taken) return;
			ctx.beginPath();
			ctx.arc(coin.x, coin.y, 9, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.fillStyle = this.palette.danger;
		this.walkers.forEach((walker) => {
			if (!walker.alive) return;
			roundRect(ctx, walker.x, walker.y, walker.w, walker.h, 6);
			ctx.fill();
		});
		ctx.fillStyle = this.palette.accent;
		roundRect(ctx, this.hero.x, this.hero.y, this.hero.w, this.hero.h, 7);
		ctx.fill();
		ctx.fillStyle = '#e2e8f0';
		ctx.fillRect(this.flagX, this.height - 170, 8, 116);
		ctx.fillStyle = this.palette.secondary;
		ctx.beginPath();
		ctx.moveTo(this.flagX + 8, this.height - 170);
		ctx.lineTo(this.flagX + 72, this.height - 148);
		ctx.lineTo(this.flagX + 8, this.height - 126);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	private drawSnake(ctx: CanvasRenderingContext2D) {
		const cols = this.snakeCols();
		const rows = this.snakeRows();
		const cell = Math.min((this.width - 72) / cols, (this.height - 118) / rows);
		const startX = (this.width - cols * cell) / 2;
		const startY = 74;
		ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
		for (let x = 0; x <= cols; x += 1) {
			ctx.beginPath();
			ctx.moveTo(startX + x * cell, startY);
			ctx.lineTo(startX + x * cell, startY + rows * cell);
			ctx.stroke();
		}
		for (let y = 0; y <= rows; y += 1) {
			ctx.beginPath();
			ctx.moveTo(startX, startY + y * cell);
			ctx.lineTo(startX + cols * cell, startY + y * cell);
			ctx.stroke();
		}
		ctx.fillStyle = this.palette.danger;
		roundRect(ctx, startX + this.snakeFood.x * cell + 3, startY + this.snakeFood.y * cell + 3, cell - 6, cell - 6, 7);
		ctx.fill();
		this.snake.forEach((segment, index) => {
			ctx.fillStyle = index === 0 ? this.palette.secondary : this.palette.accent;
			roundRect(ctx, startX + segment.x * cell + 2, startY + segment.y * cell + 2, cell - 4, cell - 4, 6);
			ctx.fill();
		});
	}

	private drawTetris(ctx: CanvasRenderingContext2D) {
		const cell = Math.min((this.width - 80) / 10, (this.height - 92) / 20);
		const startX = (this.width - cell * 10) / 2;
		const startY = 64;
		ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
		roundRect(ctx, startX - 8, startY - 8, cell * 10 + 16, cell * 20 + 16, 8);
		ctx.fill();
		for (let y = 0; y < 20; y += 1) {
			for (let x = 0; x < 10; x += 1) {
				ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
				ctx.strokeRect(startX + x * cell, startY + y * cell, cell, cell);
				if (this.tetrisBoard[y][x]) {
					ctx.fillStyle = this.tetrisBoard[y][x];
					roundRect(ctx, startX + x * cell + 2, startY + y * cell + 2, cell - 4, cell - 4, 5);
					ctx.fill();
				}
			}
		}
		if (!this.tetrisPiece) return;
		ctx.fillStyle = this.tetrisPiece.color;
		for (let y = 0; y < this.tetrisPiece.matrix.length; y += 1) {
			for (let x = 0; x < this.tetrisPiece.matrix[y].length; x += 1) {
				if (!this.tetrisPiece.matrix[y][x]) continue;
				const drawX = startX + (this.tetrisPiece.x + x) * cell;
				const drawY = startY + (this.tetrisPiece.y + y) * cell;
				roundRect(ctx, drawX + 2, drawY + 2, cell - 4, cell - 4, 5);
				ctx.fill();
			}
		}
	}

	private drawShadowAgent(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
		roundRect(ctx, 42, 70, this.width - 84, this.height - 110, 8);
		ctx.fill();
		ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
		ctx.beginPath();
		ctx.arc(this.exitZone.x, this.exitZone.y, this.exitZone.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = this.palette.secondary;
		ctx.stroke();

		for (const box of this.intelBoxes) {
			if (box.taken) continue;
			ctx.fillStyle = this.palette.secondary;
			roundRect(ctx, box.x - 11, box.y - 11, 22, 22, 4);
			ctx.fill();
		}

		for (const agent of this.agents) {
			if (!agent.alive) continue;
			this.drawVisionCone(ctx, agent);
			ctx.fillStyle = this.palette.danger;
			roundRect(ctx, agent.x - 12, agent.y - 12, 24, 24, 7);
			ctx.fill();
			ctx.strokeStyle = '#fff7ed';
			ctx.beginPath();
			ctx.moveTo(agent.x, agent.y);
			ctx.lineTo(agent.x + Math.cos(agent.angle) * 20, agent.y + Math.sin(agent.angle) * 20);
			ctx.stroke();
		}

		ctx.fillStyle = this.palette.accent;
		ctx.beginPath();
		ctx.arc(this.assassin.x, this.assassin.y, this.assassin.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#f8fafc';
		ctx.stroke();
	}

	private drawVisionCone(ctx: CanvasRenderingContext2D, agent: Agent) {
		const range = 145 + this.level * 1.2;
		ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
		ctx.beginPath();
		ctx.moveTo(agent.x, agent.y);
		ctx.arc(agent.x, agent.y, range, agent.angle - 0.38, agent.angle + 0.38);
		ctx.closePath();
		ctx.fill();
	}

	private input(primary: string, secondary: string) {
		return this.keys.has(primary) || this.keys.has(secondary) ? 1 : 0;
	}

	private snapshot(): ClassicSnapshot {
		return {
			score: Math.floor(this.score),
			speed: Number(this.speed.toFixed(1)),
			state: this.state,
			statLabel: 'Nivel',
			statValue: this.level
		};
	}

	private emitUpdate() {
		this.options.onUpdate?.(this.snapshot());
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function pointRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }) {
	return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function circleRect(cx: number, cy: number, radius: number, rect: { x: number; y: number; w: number; h: number }) {
	const nearestX = clamp(cx, rect.x, rect.x + rect.w);
	const nearestY = clamp(cy, rect.y, rect.y + rect.h);
	return Math.hypot(cx - nearestX, cy - nearestY) < radius;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function cloneMatrix(matrix: number[][]) {
	return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix: number[][]) {
	const rows = matrix.length;
	const cols = matrix[0].length;
	const next = Array.from({ length: cols }, () => Array.from({ length: rows }, () => 0));
	for (let y = 0; y < rows; y += 1) {
		for (let x = 0; x < cols; x += 1) {
			next[x][rows - y - 1] = matrix[y][x];
		}
	}
	return next;
}

function normalizeAngle(angle: number) {
	let next = angle;
	while (next > Math.PI) next -= Math.PI * 2;
	while (next < -Math.PI) next += Math.PI * 2;
	return next;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}
