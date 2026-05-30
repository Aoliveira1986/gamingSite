import { error } from '@sveltejs/kit';
import { getGameBySlug } from '$lib/games/games';

export function load({ params }) {
  const game = getGameBySlug(params.slug);

  if (!game) {
    error(404, 'Jogo não encontrado');
  }

  return { game };
}
