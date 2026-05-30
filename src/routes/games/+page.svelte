<script lang="ts">
  import GameCard from '$lib/components/GameCard.svelte';
  import { games } from '$lib/games/games';
</script>

<svelte:head>
  <title>Jogos | GameZone 3D</title>
</svelte:head>

<section class="catalog">
  <div class="section-title">
    <div>
      <h1>Jogos</h1>
      <p>Catálogo modular com jogos disponíveis e experiências em desenvolvimento.</p>
    </div>
  </div>

  <div class="grid">
    {#each games as game}
      <GameCard {game} />
    {/each}
  </div>
</section>

<style>
  .catalog {
    display: grid;
    gap: 20px;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 7vw, 5rem);
    line-height: 0.95;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  @media (max-width: 760px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
