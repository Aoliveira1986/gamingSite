<script lang="ts">
  import { page } from '$app/stores';
</script>

<nav class="navbar" aria-label="Navegação principal">
  <a class="brand" href="/" aria-label="GameZone 3D">
    <span class="brand-mark">G3</span>
    <span>GameZone 3D</span>
  </a>

  <div class="links">
    <a class:active={$page.url.pathname === '/'} href="/">Início</a>
    <a class:active={$page.url.pathname.startsWith('/games')} href="/games">Jogos</a>
  </div>
</nav>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
    padding: 0 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(7, 10, 18, 0.78);
    backdrop-filter: blur(18px);
  }

  .brand,
  .links {
    display: flex;
    align-items: center;
  }

  .brand {
    gap: 12px;
    font-weight: 900;
    letter-spacing: 0;
  }

  .brand-mark {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 1px solid rgba(34, 211, 238, 0.45);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.92), rgba(255, 79, 184, 0.78));
    color: #06111d;
    font-size: 0.88rem;
  }

  .links {
    gap: 6px;
    padding: 6px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.72);
  }

  .links a {
    border-radius: 7px;
    padding: 9px 13px;
    color: #b8c5d6;
    font-size: 0.92rem;
    font-weight: 800;
    transition:
      background 160ms ease,
      color 160ms ease;
  }

  .links a:hover,
  .links a.active {
    background: rgba(34, 211, 238, 0.13);
    color: #f8fbff;
  }

  @media (max-width: 620px) {
    .navbar {
      min-height: 64px;
      padding: 0 12px;
    }

    .brand span:last-child {
      display: none;
    }
  }
</style>
