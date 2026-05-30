<script lang="ts">
  import type { GameDefinition } from '$lib/games/games';

  export let game: GameDefinition;
</script>

<section class="game-shell" style={`--accent: ${game.accent}`}>
  <header>
    <div>
      <span class="status-pill {game.status}">
        {game.status === 'available' ? 'Disponível' : 'Em desenvolvimento'}
      </span>
      <h1>{game.name}</h1>
      <p>{game.description}</p>
    </div>
    <a class="btn secondary" href="/games">Todos os jogos</a>
  </header>

  <slot />
</section>

<style>
  .game-shell {
    display: grid;
    gap: 22px;
  }

  header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 8px;
    padding: 22px;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--accent), transparent 86%), transparent),
      rgba(15, 23, 42, 0.72);
  }

  h1 {
    margin: 12px 0 8px;
    font-size: clamp(2rem, 5vw, 4.3rem);
    line-height: 0.96;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: #b6c4d5;
    line-height: 1.65;
  }

  @media (max-width: 760px) {
    header {
      align-items: start;
      flex-direction: column;
      padding: 18px;
    }
  }
</style>
