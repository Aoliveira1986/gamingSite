export type ClassicGameId = 'brick-breaker-100' | 'space-invaders-100' | 'super-platformer';

export type ClassicSnapshot = {
	score: number;
	speed: number;
	state: 'ready' | 'running' | 'gameover';
	statLabel: string;
	statValue: number;
};

export type ClassicGameOptions = {
	id: ClassicGameId;
	onUpdate?: (snapshot: ClassicSnapshot) => void;
};
