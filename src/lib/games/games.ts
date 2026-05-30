export type GameStatus = 'available' | 'development';

export type GameDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail:
    | 'cube-runner'
    | 'space-dodge'
    | 'arena-ball'
    | 'neon-flight'
    | 'brick-breaker'
    | 'space-invaders'
    | 'super-platformer'
    | 'snake'
    | 'tetris'
    | 'shadow-agent';
  route: string;
  status: GameStatus;
  accent: string;
};

export const games: GameDefinition[] = [
  {
    id: 'cube-runner',
    name: 'Cube Runner 3D',
    description:
      'Controla um cubo energético numa pista infinita, salta e muda de faixa para evitar obstáculos.',
    category: 'Runner 3D',
    thumbnail: 'cube-runner',
    route: '/games/cube-runner',
    status: 'available',
    accent: '#22d3ee'
  },
  {
    id: 'space-dodge',
    name: 'Space Dodge 3D',
    description:
      'Um desafio espacial preparado para asteroides, boosts e navegação em profundidade.',
    category: 'Arcade espacial',
    thumbnail: 'space-dodge',
    route: '/games/space-dodge',
    status: 'available',
    accent: '#a78bfa'
  },
  {
    id: 'arena-ball',
    name: 'Arena Ball 3D',
    description:
      'Arena competitiva com física simples, power shots e partidas rápidas em browser.',
    category: 'Ação de arena',
    thumbnail: 'arena-ball',
    route: '/games/arena-ball',
    status: 'available',
    accent: '#72f59f'
  },
  {
    id: 'neon-flight',
    name: 'Neon Flight 3D',
    description:
      'Voo em túneis luminosos com curvas apertadas e sensação de velocidade cinematográfica.',
    category: 'Voo arcade',
    thumbnail: 'neon-flight',
    route: '/games/neon-flight',
    status: 'available',
    accent: '#ff4fb8'
  },
  {
    id: 'brick-breaker-100',
    name: 'Brick Breaker 100',
    description:
      'Barra em baixo, bola rapida e blocos dinamicos ao longo de 100 niveis de dificuldade progressiva.',
    category: 'Arcade de reflexos',
    thumbnail: 'brick-breaker',
    route: '/games/brick-breaker-100',
    status: 'available',
    accent: '#22d3ee'
  },
  {
    id: 'space-invaders-100',
    name: 'Space Invaders 100',
    description:
      'Defende a zona neon contra vagas espaciais com 100 niveis, tiros inimigos e velocidade crescente.',
    category: 'Shooter arcade',
    thumbnail: 'space-invaders',
    route: '/games/space-invaders-100',
    status: 'available',
    accent: '#a78bfa'
  },
  {
    id: 'super-platformer',
    name: 'Super Platformer 100',
    description:
      'Uma aventura de plataformas inspirada nos classicos, com moedas, inimigos, saltos e 100 fases.',
    category: 'Plataformas',
    thumbnail: 'super-platformer',
    route: '/games/super-platformer',
    status: 'available',
    accent: '#fbbf24'
  },
  {
    id: 'snake-100',
    name: 'Snake Grid 100',
    description:
      'Snake moderno em arena neon, comida dinamica e 100 niveis com velocidade cada vez mais apertada.',
    category: 'Arcade estrategico',
    thumbnail: 'snake',
    route: '/games/snake-100',
    status: 'available',
    accent: '#72f59f'
  },
  {
    id: 'tetris-100',
    name: 'Tetris Stack 100',
    description:
      'Empilha pecas, limpa linhas e sobe por 100 niveis de queda progressivamente mais rapida.',
    category: 'Puzzle arcade',
    thumbnail: 'tetris',
    route: '/games/tetris-100',
    status: 'available',
    accent: '#a78bfa'
  },
  {
    id: 'shadow-agent',
    name: 'Shadow Agent',
    description:
      'Infiltra uma zona vigiada, evita cones de luz, recolhe caixas de intel e neutraliza agentes.',
    category: 'Stealth tactico',
    thumbnail: 'shadow-agent',
    route: '/games/shadow-agent',
    status: 'available',
    accent: '#ff4fb8'
  }
];

export const featuredGames = games.slice(0, 3);

export function getGameBySlug(slug: string) {
  return games.find((game) => game.id === slug);
}
