export type ArcadeGameId = 'space-dodge' | 'arena-ball' | 'neon-flight';

export type ArcadeSnapshot = {
  score: number;
  speed: number;
  state: 'ready' | 'running' | 'gameover';
  statLabel: string;
  statValue: number;
};

export type ArcadeGameOptions = {
  id: ArcadeGameId;
  onUpdate?: (snapshot: ArcadeSnapshot) => void;
};

export type ArcadeTouchControls = {
  moveX?: number;
  moveY?: number;
  action?: boolean;
};
