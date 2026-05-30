<script lang="ts">
  import GameCard from '$lib/components/GameCard.svelte';
  import { featuredGames, games } from '$lib/games/games';
</script>

<svelte:head>
  <title>GameZone 3D | Jogos 3D no browser</title>
</svelte:head>

<div class="page-stack">
  <section class="hero">
    <div class="hero-copy">
      <span class="kicker">Browser arcade moderno</span>
      <h1>GameZone 3D</h1>
      <p>
        Um portal de jogos online com experiências 3D leves, rápidas e prontas para jogar no
        browser. Sem pixel art, sem nostalgia preguiçosa: arcade atual com energia neon.
      </p>
      <div class="hero-actions">
        <a class="btn" href="/games/cube-runner">Jogar Agora</a>
        <a class="btn secondary" href="/games">Ver catálogo</a>
      </div>
    </div>

    <div class="hero-scene" aria-hidden="true">
      <span class="lane"></span>
      <span class="cube player"></span>
      <span class="cube obstacle left"></span>
      <span class="cube obstacle right"></span>
      <span class="speed-line a"></span>
      <span class="speed-line b"></span>
      <span class="speed-line c"></span>
    </div>
  </section>

  <section>
    <div class="section-title">
      <div>
        <h2>Jogos em destaque</h2>
        <p>Começa pelo Cube Runner 3D e explora a base preparada para novas experiências.</p>
      </div>
      <a href="/games">Todos os jogos</a>
    </div>

    <div class="grid featured">
      {#each featuredGames as game}
        <GameCard {game} featured />
      {/each}
    </div>
  </section>

  <section class="system">
    <div>
      <span class="kicker">Sistema expansível</span>
      <h2>Catálogo orientado por dados</h2>
      <p>
        Cada jogo nasce de uma definição simples com id, rota, categoria, estado e thumbnail CSS.
        A rota dinâmica carrega o jogo certo e deixa páginas de desenvolvimento prontas para evoluir.
      </p>
    </div>
    <div class="stats">
      <strong>{games.length}</strong>
      <span>jogos registados</span>
    </div>
  </section>
</div>

<style>
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
    gap: 24px;
    min-height: 620px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 8px;
    padding: clamp(26px, 5vw, 58px);
    background:
      linear-gradient(135deg, rgba(34, 211, 238, 0.13), transparent 44%),
      linear-gradient(45deg, rgba(255, 79, 184, 0.1), transparent 38%),
      rgba(15, 23, 42, 0.72);
    box-shadow: var(--shadow);
  }

  .hero-copy {
    z-index: 2;
    align-self: center;
    max-width: 650px;
  }

  .kicker {
    display: inline-flex;
    color: var(--green);
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  h1 {
    margin: 14px 0 16px;
    font-size: clamp(3.2rem, 9vw, 7.8rem);
    line-height: 0.88;
  }

  .hero p,
  .system p {
    color: #b8c5d6;
    font-size: 1.08rem;
    line-height: 1.75;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }

  .hero-scene {
    position: relative;
    min-height: 520px;
    perspective: 800px;
  }

  .lane {
    position: absolute;
    inset: 12% 9% -16% 9%;
    transform: rotateX(64deg);
    border: 1px solid rgba(34, 211, 238, 0.42);
    background:
      linear-gradient(90deg, transparent 31%, rgba(255, 255, 255, 0.18) 32%, transparent 33% 65%, rgba(255, 255, 255, 0.18) 66%, transparent 67%),
      repeating-linear-gradient(0deg, rgba(34, 211, 238, 0.16) 0 2px, transparent 2px 42px);
    box-shadow: inset 0 0 80px rgba(34, 211, 238, 0.16), 0 0 60px rgba(34, 211, 238, 0.2);
  }

  .cube,
  .speed-line {
    position: absolute;
    display: block;
  }

  .cube {
    width: 92px;
    height: 92px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 8px;
    background: linear-gradient(135deg, #22d3ee, #0f172a 78%);
    box-shadow: 0 20px 56px rgba(0, 0, 0, 0.38), 0 0 42px rgba(34, 211, 238, 0.56);
    transform: rotateX(18deg) rotateY(-28deg) rotateZ(8deg);
  }

  .player {
    left: 44%;
    bottom: 108px;
    animation: float 2.4s ease-in-out infinite;
  }

  .obstacle {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #ff4fb8, #101827);
    box-shadow: 0 0 38px rgba(255, 79, 184, 0.5);
  }

  .obstacle.left {
    left: 21%;
    top: 96px;
  }

  .obstacle.right {
    right: 17%;
    top: 186px;
  }

  .speed-line {
    width: 2px;
    height: 120px;
    background: linear-gradient(180deg, transparent, rgba(114, 245, 159, 0.9), transparent);
    opacity: 0.7;
  }

  .speed-line.a {
    left: 16%;
    top: 26%;
  }

  .speed-line.b {
    right: 26%;
    top: 10%;
  }

  .speed-line.c {
    right: 11%;
    bottom: 18%;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .section-title a {
    color: var(--cyan);
    font-weight: 900;
  }

  .system {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 24px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 8px;
    padding: 26px;
    background: rgba(15, 23, 42, 0.62);
  }

  .system h2 {
    margin: 8px 0 10px;
    font-size: clamp(1.7rem, 4vw, 3rem);
  }

  .system p {
    max-width: 740px;
    margin: 0;
  }

  .stats {
    display: grid;
    place-items: center;
    width: 148px;
    height: 148px;
    border: 1px solid rgba(34, 211, 238, 0.28);
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.55);
  }

  .stats strong {
    font-size: 3.8rem;
    line-height: 1;
  }

  .stats span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotateX(18deg) rotateY(-28deg) rotateZ(8deg);
    }

    50% {
      transform: translateY(-18px) rotateX(18deg) rotateY(-28deg) rotateZ(8deg);
    }
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .hero-scene {
      min-height: 360px;
    }

    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .hero {
      padding: 22px;
    }

    .grid,
    .system {
      grid-template-columns: 1fr;
    }

    .stats {
      width: 100%;
      height: 110px;
    }
  }
</style>
