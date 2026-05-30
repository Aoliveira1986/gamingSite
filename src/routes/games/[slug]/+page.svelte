<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import GameLayout from '$lib/components/GameLayout.svelte';
  import { Arcade3DGame } from '$lib/games/Arcade3D/Arcade3DGame';
  import type { ArcadeGameId, ArcadeSnapshot } from '$lib/games/Arcade3D/types';
  import { ClassicArcadeGame } from '$lib/games/ClassicArcade/ClassicArcadeGame';
  import type { ClassicGameId, ClassicSnapshot } from '$lib/games/ClassicArcade/types';
  import { CubeRunnerGame } from '$lib/games/CubeRunner3D/CubeRunnerGame';
  import type { CubeRunnerSnapshot } from '$lib/games/CubeRunner3D/types';
  import type { PageData } from './$types';

  type GameInstance = {
    start: () => void;
    restart: () => void;
    dispose: () => void;
  };

  type GameSnapshot = (CubeRunnerSnapshot | ArcadeSnapshot | ClassicSnapshot) & {
    statLabel?: string;
    statValue?: number;
  };

  export let data: PageData;

  let mountNode: HTMLDivElement;
  let gameInstance: GameInstance | undefined;
  let currentGameId = '';
  let isFullscreen = false;
  let snapshot: GameSnapshot = {
    score: 0,
    speed: 10,
    state: 'ready'
  };

  $: arcadeId = data.game.id as ArcadeGameId;
  $: classicId = data.game.id as ClassicGameId;
  $: if (browser && mountNode && currentGameId !== data.game.id) {
    initializeGame();
  }

  onMount(() => {
    initializeGame();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    window.addEventListener('keydown', handlePageKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', handlePageKeyDown);
      disposeGame();
    };
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', handlePageKeyDown);
    }
    disposeGame();
  });

  function initializeGame() {
    if (!mountNode) return;
    if (currentGameId === data.game.id && gameInstance) return;

    disposeGame();
    currentGameId = data.game.id;
    snapshot = {
      score: 0,
      speed: 10,
      state: 'ready'
    };

    if (data.game.id === 'cube-runner') {
      gameInstance = new CubeRunnerGame(mountNode, {
        onUpdate: (nextSnapshot) => {
          snapshot = nextSnapshot;
        }
      });
    } else if (isClassicGame(data.game.id)) {
      gameInstance = new ClassicArcadeGame(mountNode, {
        id: classicId,
        onUpdate: (nextSnapshot) => {
          snapshot = nextSnapshot;
        }
      });
    } else {
      gameInstance = new Arcade3DGame(mountNode, {
        id: arcadeId,
        onUpdate: (nextSnapshot) => {
          snapshot = nextSnapshot;
        }
      });
    }
  }

  function disposeGame() {
    gameInstance?.dispose();
    gameInstance = undefined;
  }

  function restartGame() {
    gameInstance?.restart();
  }

  function startGame() {
    gameInstance?.start();
  }

  async function toggleFullscreen() {
    if (!mountNode) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await mountNode.requestFullscreen();
    }
  }

  function syncFullscreenState() {
    isFullscreen = document.fullscreenElement === mountNode;
  }

  function handlePageKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() !== 'f') return;
    event.preventDefault();
    toggleFullscreen();
  }

  function stateLabel() {
    if (snapshot.state === 'ready') return 'Pronto';
    if (snapshot.state === 'running') return 'A correr';
    return 'Game Over';
  }

  function helpText() {
    if (data.game.id === 'cube-runner') {
      return 'Usa A/D ou setas para mudar de faixa. Espaco salta. Enter ou botao reinicia.';
    }

    if (data.game.id === 'space-dodge') {
      return 'Pilota com WASD ou setas, usa Espaco para acelerar e evita asteroides. Tens escudos antes do Game Over.';
    }

    if (data.game.id === 'arena-ball') {
      return 'Move a esfera com WASD ou setas, segura Espaco para ganhar impulso, apanha orbes e evita os cubos vermelhos.';
    }

    if (data.game.id === 'brick-breaker-100') {
      return 'Move a barra com A/D ou setas, mantem a bola viva e limpa todos os blocos. Sao 100 niveis cada vez mais apertados.';
    }

    if (data.game.id === 'space-invaders-100') {
      return 'Move com A/D ou setas e dispara com Espaco. Elimina todas as vagas espaciais ao longo de 100 niveis.';
    }

    if (data.game.id === 'super-platformer') {
      return 'Corre com A/D ou setas, salta com Espaco/W/seta cima, apanha moedas, pisa inimigos e chega a bandeira.';
    }

    return 'Voa com WASD ou setas, usa Espaco para boost e passa pelo centro dos aneis neon sem tocar na borda.';
  }

  function isClassicGame(id: string): id is ClassicGameId {
    return id === 'brick-breaker-100' || id === 'space-invaders-100' || id === 'super-platformer';
  }
</script>

<svelte:head>
  <title>{data.game.name} | GameZone 3D</title>
</svelte:head>

<GameLayout game={data.game}>
  <div class="runner" style={`--accent: ${data.game.accent}`}>
    <div class="hud">
      <div>
        <span>Pontuacao</span>
        <strong>{snapshot.score}</strong>
      </div>
      <div>
        <span>Velocidade</span>
        <strong>{snapshot.speed}x</strong>
      </div>
      <div>
        <span>{snapshot.statLabel ?? 'Estado'}</span>
        <strong>{snapshot.statLabel ? snapshot.statValue : stateLabel()}</strong>
      </div>
      <button class="reset" type="button" on:click={toggleFullscreen}>
        {isFullscreen ? 'Sair ecrã' : 'Ecrã cheio'}
      </button>
      <button class="reset" type="button" on:click={restartGame}>Recomecar</button>
    </div>

    <div class="stage" bind:this={mountNode} aria-label={data.game.name}>
      {#if snapshot.state !== 'running'}
        <div class="overlay">
          <h2>{snapshot.state === 'gameover' ? 'Game Over' : data.game.name}</h2>
          <p>{helpText()} Pressiona F para alternar ecrã cheio.</p>
          <button class="btn" on:click={snapshot.state === 'gameover' ? restartGame : startGame}>
            {snapshot.state === 'gameover' ? 'Recomecar' : 'Comecar'}
          </button>
        </div>
      {/if}
    </div>
  </div>
</GameLayout>

<style>
  .runner {
    position: relative;
    display: grid;
    gap: 14px;
  }

  .hud {
    position: absolute;
    z-index: 3;
    top: 14px;
    left: 14px;
    right: 14px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    pointer-events: none;
  }

  .hud div {
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 12px;
    background: rgba(2, 6, 23, 0.7);
    backdrop-filter: blur(12px);
  }

  .hud .reset {
    pointer-events: auto;
    min-height: 48px;
    border: 1px solid color-mix(in srgb, var(--accent), transparent 62%);
    border-radius: 8px;
    padding: 0 14px;
    background: rgba(15, 23, 42, 0.82);
    color: #eaf8ff;
    font-weight: 900;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  .hud .reset:hover {
    border-color: color-mix(in srgb, var(--accent), white 12%);
  }

  .hud span {
    display: block;
    color: #8fa2b8;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .hud strong {
    display: block;
    margin-top: 4px;
    color: #f8fbff;
    font-size: clamp(1.2rem, 3vw, 1.85rem);
  }

  .stage {
    position: relative;
    min-height: 680px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--accent), transparent 68%);
    border-radius: 8px;
    background: #070a12;
    box-shadow: var(--shadow);
    touch-action: none;
  }

  .stage:fullscreen {
    width: 100vw;
    height: 100vh;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .stage :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    z-index: 2;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    padding: 24px;
    text-align: center;
    background: linear-gradient(180deg, rgba(7, 10, 18, 0.28), rgba(7, 10, 18, 0.76));
  }

  .overlay h2 {
    margin: 0;
    font-size: clamp(2rem, 6vw, 4.8rem);
    line-height: 0.95;
  }

  .overlay p {
    max-width: 620px;
    margin: 0;
    color: #c5d2e1;
    line-height: 1.6;
  }

  @media (max-width: 860px) {
    .stage {
      min-height: 560px;
    }
  }

  @media (max-width: 620px) {
    .hud {
      grid-template-columns: 1fr 1fr;
    }

    .stage {
      min-height: 520px;
    }
  }
</style>
