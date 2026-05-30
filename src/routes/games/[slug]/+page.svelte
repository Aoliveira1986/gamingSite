<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import GameLayout from '$lib/components/GameLayout.svelte';
  import { Arcade3DGame } from '$lib/games/Arcade3D/Arcade3DGame';
  import type { ArcadeGameId, ArcadeSnapshot } from '$lib/games/Arcade3D/types';
  import { ClassicArcadeGame } from '$lib/games/ClassicArcade/ClassicArcadeGame';
  import type { ClassicGameId, ClassicSnapshot } from '$lib/games/ClassicArcade/types';
  import { CubeRunnerGame } from '$lib/games/CubeRunner3D/CubeRunnerGame';
  import type { CubeRunnerSnapshot } from '$lib/games/CubeRunner3D/types';
  import type { PageData } from './$types';

  type TouchControls = {
    move?: number;
    moveX?: number;
    moveY?: number;
    jump?: boolean;
    fire?: boolean;
    action?: boolean;
  };

  type GameInstance = {
    start: () => void;
    restart: () => void;
    dispose: () => void;
    setTouchControls?: (controls: TouchControls) => void;
  };

  type GameSnapshot = (CubeRunnerSnapshot | ArcadeSnapshot | ClassicSnapshot) & {
    statLabel?: string;
    statValue?: number;
  };

  export let data: PageData;

  const TEST_PASSWORD = 'vbgrantaccess';

  let gameFrame: HTMLDivElement;
  let mountNode: HTMLDivElement;
  let gameInstance: GameInstance | undefined;
  let currentGameId = '';
  let isFullscreen = false;
  let pseudoFullscreen = false;
  let hasTestAccess = false;
  let testPassword = '';
  let passwordError = '';
  let touchMoveX = 0;
  let touchMoveY = 0;
  let touchAction = false;
  let snapshot: GameSnapshot = {
    score: 0,
    speed: 10,
    state: 'ready'
  };

  $: arcadeId = data.game.id as ArcadeGameId;
  $: classicId = data.game.id as ClassicGameId;
  $: requiresFullscreen = isClassicGame(data.game.id);
  $: lockedForTesting = isClassicGame(data.game.id) && !hasTestAccess;
  $: fullscreenRequired = requiresFullscreen && !isFullscreen;
  $: if (browser && mountNode && !lockedForTesting && currentGameId !== data.game.id) {
    initializeGame();
  }

  onMount(() => {
    hasTestAccess = localStorage.getItem(testAccessKey(data.game.id)) === 'granted';
    if (!lockedForTesting) initializeGame();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    window.addEventListener('keydown', handlePageKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', handlePageKeyDown);
      disposeGame();
    };
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', handlePageKeyDown);
      document.body.classList.remove('game-fullscreen-lock');
    }
    disposeGame();
  });

  function initializeGame() {
    if (lockedForTesting) {
      disposeGame();
      return;
    }
    if (!mountNode) return;
    if (currentGameId === data.game.id && gameInstance) return;

    disposeGame();
    currentGameId = data.game.id;
    snapshot = { score: 0, speed: 10, state: 'ready' };

    if (data.game.id === 'cube-runner') {
      gameInstance = new CubeRunnerGame(mountNode, {
        onUpdate: (nextSnapshot) => (snapshot = nextSnapshot)
      });
    } else if (isClassicGame(data.game.id)) {
      gameInstance = new ClassicArcadeGame(mountNode, {
        id: classicId,
        onUpdate: (nextSnapshot) => (snapshot = nextSnapshot)
      });
    } else {
      gameInstance = new Arcade3DGame(mountNode, {
        id: arcadeId,
        onUpdate: (nextSnapshot) => (snapshot = nextSnapshot)
      });
    }
  }

  function disposeGame() {
    gameInstance?.dispose();
    gameInstance = undefined;
  }

  function restartGame() {
    if (fullscreenRequired) {
      enterRequiredFullscreen();
      return;
    }
    gameInstance?.restart();
  }

  function startGame() {
    if (fullscreenRequired) {
      enterRequiredFullscreen();
      return;
    }
    gameInstance?.start();
  }

  async function enterRequiredFullscreen() {
    await toggleFullscreen();

    if (requiresFullscreen && (getFullscreenElement() === gameFrame || pseudoFullscreen)) {
      if (snapshot.state === 'gameover') {
        gameInstance?.restart();
      } else {
        gameInstance?.start();
      }
    }
  }

  async function toggleFullscreen() {
    if (!gameFrame) return;

    try {
      if (getFullscreenElement()) {
        await exitNativeFullscreen();
        pseudoFullscreen = false;
      } else if (canRequestFullscreen(gameFrame)) {
        await requestNativeFullscreen(gameFrame);
      } else {
        pseudoFullscreen = !pseudoFullscreen;
      }
    } catch {
      pseudoFullscreen = !pseudoFullscreen;
    }

    syncFullscreenState();
  }

  function syncFullscreenState() {
    isFullscreen = getFullscreenElement() === gameFrame || pseudoFullscreen;
    if (browser) document.body.classList.toggle('game-fullscreen-lock', isFullscreen);
  }

  function handlePageKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() !== 'f' || lockedForTesting) return;
    event.preventDefault();
    toggleFullscreen();
  }

  function unlockTestGame() {
    if (testPassword.trim() !== TEST_PASSWORD) {
      passwordError = 'Password errada.';
      return;
    }

    passwordError = '';
    hasTestAccess = true;
    localStorage.setItem(testAccessKey(data.game.id), 'granted');
    requestAnimationFrame(() => initializeGame());
  }

  function setTouchMove(x: number, y = 0) {
    touchMoveX = x;
    touchMoveY = y;
    gameInstance?.setTouchControls?.({ move: x, moveX: x, moveY: y });
  }

  function setTouchAction(active: boolean) {
    touchAction = active;
    gameInstance?.setTouchControls?.({ jump: active, fire: active, action: active });
  }

  function stateLabel() {
    if (snapshot.state === 'ready') return 'Pronto';
    if (snapshot.state === 'running') return 'A correr';
    return 'Game Over';
  }

  function helpText() {
    if (data.game.id === 'cube-runner') return 'A/D ou setas mudam de faixa. Espaco salta.';
    if (data.game.id === 'space-dodge') return 'WASD ou setas pilotam. Espaco faz boost.';
    if (data.game.id === 'arena-ball') return 'WASD ou setas movem a esfera. Espaco da impulso.';
    if (data.game.id === 'brick-breaker-100') return 'Move a barra com setas, rato ou toque.';
    if (data.game.id === 'space-invaders-100') return 'Move com setas/toque e dispara com Espaco ou toque.';
    if (data.game.id === 'super-platformer') return 'Corre com setas/toque e salta com Espaco ou Acao.';
    return 'WASD ou setas pilotam. Espaco faz boost.';
  }

  function isClassicGame(id: string): id is ClassicGameId {
    return id === 'brick-breaker-100' || id === 'space-invaders-100' || id === 'super-platformer';
  }

  function testAccessKey(id: string) {
    return `gamezone-test-access:${id}`;
  }

  function getFullscreenElement() {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  }

  function canRequestFullscreen(element: HTMLElement) {
    const item = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    return Boolean(item.requestFullscreen ?? item.webkitRequestFullscreen);
  }

  function requestNativeFullscreen(element: HTMLElement) {
    const item = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const request = item.requestFullscreen ?? item.webkitRequestFullscreen;
    return Promise.resolve(request?.call(item));
  }

  function exitNativeFullscreen() {
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
    const exit = document.exitFullscreen ?? doc.webkitExitFullscreen;
    return Promise.resolve(exit?.call(document));
  }
</script>

<svelte:head>
  <title>{data.game.name} | GameZone 3D</title>
</svelte:head>

<GameLayout game={data.game}>
  <div
    class="runner"
    class:fullscreen-mode={isFullscreen}
    bind:this={gameFrame}
    style={`--accent: ${data.game.accent}`}
  >
    {#if lockedForTesting}
      <section class="test-gate">
        <span class="status-pill development">Em testes</span>
        <h2>{data.game.name}</h2>
        <p>Este jogo esta em testes privados. Usa a password de acesso.</p>
        <form on:submit|preventDefault={unlockTestGame}>
          <input
            bind:value={testPassword}
            type="password"
            autocomplete="off"
            placeholder="Password de testes"
            aria-label="Password de testes"
          />
          <button class="btn" type="submit">Entrar</button>
        </form>
        {#if passwordError}
          <strong>{passwordError}</strong>
        {/if}
      </section>
    {:else}
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
          {isFullscreen ? 'Sair' : 'Fullscreen'}
        </button>
        <button class="reset" type="button" on:click={restartGame}>Recomecar</button>
      </div>

      <div class="stage" bind:this={mountNode} aria-label={data.game.name}>
        <button class="stage-fullscreen" type="button" on:click={toggleFullscreen}>
          {isFullscreen ? 'Sair' : 'Tela cheia'}
        </button>

        {#if fullscreenRequired || snapshot.state !== 'running'}
          <div class="overlay">
            <h2>
              {fullscreenRequired
                ? 'Fullscreen obrigatorio'
                : snapshot.state === 'gameover'
                  ? 'Game Over'
                  : data.game.name}
            </h2>
            <p>
              {#if fullscreenRequired}
                Este jogo deve ser jogado em tela cheia para manter os controlos e a area de jogo estaveis.
              {:else}
                {helpText()} Pressiona F ou usa o botao Tela cheia.
              {/if}
            </p>
            <button
              class="btn"
              on:click={fullscreenRequired ? enterRequiredFullscreen : snapshot.state === 'gameover' ? restartGame : startGame}
            >
              {fullscreenRequired ? 'Jogar em fullscreen' : snapshot.state === 'gameover' ? 'Recomecar' : 'Comecar'}
            </button>
          </div>
        {/if}

        <div class="touch-controls" aria-label="Controlos tacteis">
          <div class="pad">
            <button
              type="button"
              aria-label="Mover esquerda"
              class:active={touchMoveX < 0}
              on:pointerdown|preventDefault={() => setTouchMove(-1)}
              on:pointerup|preventDefault={() => setTouchMove(0)}
              on:pointercancel|preventDefault={() => setTouchMove(0)}
              on:pointerleave|preventDefault={() => setTouchMove(0)}
            >
              L
            </button>
            <div class="vertical">
              <button
                type="button"
                aria-label="Mover cima"
                class:active={touchMoveY > 0}
                on:pointerdown|preventDefault={() => setTouchMove(touchMoveX, 1)}
                on:pointerup|preventDefault={() => setTouchMove(touchMoveX, 0)}
                on:pointercancel|preventDefault={() => setTouchMove(touchMoveX, 0)}
                on:pointerleave|preventDefault={() => setTouchMove(touchMoveX, 0)}
              >
                U
              </button>
              <button
                type="button"
                aria-label="Mover baixo"
                class:active={touchMoveY < 0}
                on:pointerdown|preventDefault={() => setTouchMove(touchMoveX, -1)}
                on:pointerup|preventDefault={() => setTouchMove(touchMoveX, 0)}
                on:pointercancel|preventDefault={() => setTouchMove(touchMoveX, 0)}
                on:pointerleave|preventDefault={() => setTouchMove(touchMoveX, 0)}
              >
                D
              </button>
            </div>
            <button
              type="button"
              aria-label="Mover direita"
              class:active={touchMoveX > 0}
              on:pointerdown|preventDefault={() => setTouchMove(1)}
              on:pointerup|preventDefault={() => setTouchMove(0)}
              on:pointercancel|preventDefault={() => setTouchMove(0)}
              on:pointerleave|preventDefault={() => setTouchMove(0)}
            >
              R
            </button>
          </div>

          <button
            class="action"
            type="button"
            aria-label="Acao"
            class:active={touchAction}
            on:pointerdown|preventDefault={() => setTouchAction(true)}
            on:pointerup|preventDefault={() => setTouchAction(false)}
            on:pointercancel|preventDefault={() => setTouchAction(false)}
            on:pointerleave|preventDefault={() => setTouchAction(false)}
          >
            Acao
          </button>
        </div>
      </div>
    {/if}
  </div>
</GameLayout>

<style>
  .runner {
    position: relative;
    display: grid;
    gap: 14px;
  }

  .runner.fullscreen-mode {
    position: fixed;
    z-index: 9999;
    inset: 0;
    display: block;
    padding: 0;
    background: #070a12;
  }

  .runner.fullscreen-mode .stage,
  .runner:fullscreen .stage {
    width: 100vw;
    height: 100vh;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .runner:fullscreen {
    width: 100vw;
    height: 100vh;
    background: #070a12;
  }

  .hud {
    position: absolute;
    z-index: 6;
    top: 14px;
    left: 14px;
    right: 14px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    pointer-events: none;
  }

  .hud div,
  .hud .reset {
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 12px;
    background: rgba(2, 6, 23, 0.72);
    color: #eaf8ff;
    backdrop-filter: blur(12px);
  }

  .hud .reset {
    pointer-events: auto;
    min-height: 48px;
    font-weight: 900;
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
    user-select: none;
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

  .overlay p,
  .test-gate p {
    max-width: 620px;
    margin: 0;
    color: #c5d2e1;
    line-height: 1.6;
  }

  .stage-fullscreen {
    position: absolute;
    z-index: 5;
    right: 14px;
    bottom: 110px;
    min-height: 42px;
    border: 1px solid color-mix(in srgb, var(--accent), transparent 58%);
    border-radius: 8px;
    padding: 0 12px;
    background: rgba(2, 6, 23, 0.72);
    color: #eff6ff;
    font-weight: 900;
    backdrop-filter: blur(12px);
  }

  .touch-controls {
    position: absolute;
    z-index: 4;
    left: 14px;
    right: 14px;
    bottom: max(10px, env(safe-area-inset-bottom));
    display: none;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }

  .pad {
    display: grid;
    grid-template-columns: repeat(3, 52px);
    align-items: center;
    gap: 7px;
  }

  .vertical {
    display: grid;
    gap: 7px;
  }

  .touch-controls button {
    pointer-events: auto;
    width: 52px;
    height: 52px;
    border: 1px solid color-mix(in srgb, var(--accent), transparent 48%);
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.72);
    color: #eff6ff;
    font-size: 0.9rem;
    font-weight: 900;
    backdrop-filter: blur(12px);
  }

  .touch-controls button.active,
  .touch-controls button:active {
    background: color-mix(in srgb, var(--accent), transparent 22%);
    color: #071018;
  }

  .touch-controls .action {
    width: 70px;
    height: 70px;
    border-radius: 999px;
    font-size: 0.82rem;
  }

  .test-gate {
    display: grid;
    place-items: center;
    gap: 14px;
    min-height: 520px;
    border: 1px solid color-mix(in srgb, var(--accent), transparent 68%);
    border-radius: 8px;
    padding: 24px;
    background: rgba(15, 23, 42, 0.72);
    text-align: center;
  }

  .test-gate h2 {
    margin: 0;
    font-size: clamp(2rem, 6vw, 4rem);
  }

  .test-gate form {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .test-gate input {
    min-height: 44px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    padding: 0 12px;
    background: rgba(2, 6, 23, 0.72);
    color: #eff6ff;
  }

  .test-gate strong {
    color: #fb7185;
  }

  @media (max-width: 860px) {
    .stage {
      min-height: 560px;
    }
  }

  @media (max-width: 620px) {
    .hud {
      top: 8px;
      left: 8px;
      right: 8px;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .hud div,
    .hud .reset {
      min-height: 40px;
      padding: 8px;
    }

    .hud span {
      font-size: 0.66rem;
    }

    .hud strong {
      font-size: 1rem;
    }

    .stage {
      min-height: calc(100vh - 110px);
    }

    .touch-controls {
      display: flex;
    }

    .stage-fullscreen {
      right: 10px;
      bottom: 90px;
    }
  }

  @media (max-width: 430px) {
    .touch-controls {
      left: 8px;
      right: 8px;
      gap: 8px;
    }

    .pad {
      grid-template-columns: repeat(3, 46px);
      gap: 6px;
    }

    .vertical {
      gap: 6px;
    }

    .touch-controls button {
      width: 46px;
      height: 46px;
      font-size: 0.78rem;
    }

    .touch-controls .action {
      width: 62px;
      height: 62px;
      font-size: 0.72rem;
    }

    .stage-fullscreen {
      bottom: 78px;
      min-height: 36px;
      padding: 0 10px;
      font-size: 0.78rem;
    }
  }

  @media (max-height: 700px) {
    .hud div,
    .hud .reset {
      min-height: 34px;
      padding: 6px;
    }

    .touch-controls button {
      width: 44px;
      height: 44px;
    }

    .pad {
      grid-template-columns: repeat(3, 44px);
    }

    .touch-controls .action {
      width: 58px;
      height: 58px;
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .touch-controls {
      display: flex;
    }
  }
</style>
