import type { ClassicGameId, ClassicGameOptions, ClassicSnapshot } from './types';

type Brick = { x: number; y: number; w: number; h: number; hp: number; color: string };
type Enemy = { x: number; y: number; w: number; h: number; alive: boolean; phase: number };
type Shot = { x: number; y: number; vy: number; from: 'player' | 'enemy' };
type Platform = { x: number; y: number; w: number; h: number };
type Coin = { x: number; y: number; taken: boolean };
type Walker = { x: number; y: number; w: number; h: number; vx: number; alive: boolean };

const PALETTE: Record<ClassicGameId, { accent: string; secondary: string; danger: string }> = {
	'brick-breaker-100': { accent: '#22d3ee', secondary: '#72f59f', danger: '#ff4fb8' },
	'space-invaders-100': { accent: '#a78bfa', secondary: '#22d3ee', danger: '#fb7185' },
	'super-platformer': { accent: '#fbbf24', secondary: '#72f59f', danger: '#ff4fb8' }
};

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
		const move = this.input('d', 'arrowright') - this.input('a', 'arrowleft');
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
		const move = this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		if (this.pointerX !== null) {
			this.invaderPlayer.x = clamp(this.pointerX - this.invaderPlayer.w / 2, 12, this.width - this.invaderPlayer.w - 12);
		} else {
			this.invaderPlayer.x = clamp(this.invaderPlayer.x + move * delta * 410, 12, this.width - this.invaderPlayer.w - 12);
		}
		this.invaderPlayer.cooldown -= delta;
		if (this.keys.has(' ') && this.invaderPlayer.cooldown <= 0) {
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
		const move = this.input('d', 'arrowright') - this.input('a', 'arrowleft');
		this.hero.vx = move * (230 + this.level * 0.8);
		if ((this.keys.has(' ') || this.keys.has('w') || this.keys.has('arrowup')) && this.hero.grounded) {
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

	private draw() {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.clearRect(0, 0, this.width, this.height);
		this.drawBackground(ctx);
		if (this.options.id === 'brick-breaker-100') this.drawBreaker(ctx);
		if (this.options.id === 'space-invaders-100') this.drawInvaders(ctx);
		if (this.options.id === 'super-platformer') this.drawPlatformer(ctx);
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
