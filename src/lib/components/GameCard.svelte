<script lang="ts">
  import type { GameDefinition } from '$lib/games/games';

  export let game: GameDefinition;
  export let featured = false;
</script>

<article class="card" class:featured style={`--accent: ${game.accent}`}>
  <a class="preview {game.thumbnail}" href={game.route} aria-label={`Abrir ${game.name}`}>
    <span class="track"></span>
    <span class="object one"></span>
    <span class="object two"></span>
    <span class="object three"></span>
  </a>

  <div class="content">
    <div class="meta">
      <span>{game.category}</span>
      <span class={`status-pill ${game.status}`}>
        {game.status === 'available' ? 'Disponível' : 'Em desenvolvimento'}
      </span>
    </div>
    <h3>{game.name}</h3>
    <p>{game.description}</p>
    <a class="btn" class:secondary={game.status !== 'available'} href={game.route}>
      {game.status === 'available' ? 'Jogar' : 'Ver página'}
    </a>
  </div>
</article>

<style>
  .card {
    display: grid;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.78);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .card:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent), transparent 45%);
    box-shadow: 0 24px 62px rgba(0, 0, 0, 0.34);
  }

  .preview {
    position: relative;
    display: block;
    min-height: 210px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--accent), transparent 55%), transparent 34%),
      linear-gradient(180deg, #172033 0%, #08111d 100%);
  }

  .preview::before {
    content: "";
    position: absolute;
    inset: 18% 16% -12% 16%;
    transform: perspective(280px) rotateX(58deg);
    border: 1px solid color-mix(in srgb, var(--accent), transparent 55%);
    background:
      linear-gradient(90deg, transparent 31%, rgba(255, 255, 255, 0.13) 32%, transparent 33% 65%, rgba(255, 255, 255, 0.13) 66%, transparent 67%),
      repeating-linear-gradient(0deg, color-mix(in srgb, var(--accent), transparent 84%) 0 2px, transparent 2px 28px);
    box-shadow: 0 0 36px color-mix(in srgb, var(--accent), transparent 65%);
  }

  .track,
  .object {
    position: absolute;
    display: block;
  }

  .track {
    inset: auto 20% 22px;
    height: 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent), white 15%);
    box-shadow: 0 0 26px var(--accent);
  }

  .object {
    width: 46px;
    height: 46px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 8px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent), white 20%), #101827);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.34), 0 0 28px color-mix(in srgb, var(--accent), transparent 35%);
  }

  .one {
    left: 45%;
    bottom: 58px;
    transform: rotate(12deg);
  }

  .two {
    right: 20%;
    top: 52px;
    width: 28px;
    height: 28px;
    opacity: 0.88;
  }

  .three {
    left: 20%;
    top: 72px;
    width: 22px;
    height: 22px;
    opacity: 0.72;
  }

  .space-dodge .object {
    border-radius: 999px 999px 8px 8px;
  }

  .arena-ball .object {
    border-radius: 999px;
  }

  .neon-flight .object {
    clip-path: polygon(50% 0, 100% 100%, 50% 72%, 0 100%);
  }

  .content {
    display: grid;
    gap: 13px;
    padding: 18px;
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 800;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  p {
    min-height: 62px;
    margin: 0;
    color: #aebdd0;
    line-height: 1.55;
  }

  .btn {
    width: fit-content;
  }

  @media (max-width: 640px) {
    .preview {
      min-height: 180px;
    }
  }
</style>
