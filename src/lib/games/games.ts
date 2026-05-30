export type GameStatus = 'available' | 'development';

export type GameDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: 'cube-runner' | 'space-dodge' | 'arena-ball' | 'neon-flight';
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
  }
];

export const featuredGames = games.slice(0, 3);

export function getGameBySlug(slug: string) {
  return games.find((game) => game.id === slug);
}
