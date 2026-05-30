export type CubeRunnerSnapshot = {
  score: number;
  speed: number;
  state: 'ready' | 'running' | 'gameover';
};

export type CubeRunnerOptions = {
  onUpdate?: (snapshot: CubeRunnerSnapshot) => void;
  onGameOver?: (snapshot: CubeRunnerSnapshot) => void;
};
