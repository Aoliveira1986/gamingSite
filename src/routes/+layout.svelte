<script lang="ts">
  import '../app.css';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
</script>

<svelte:head>
  <title>GameZone 3D</title>
</svelte:head>

<div class="app">
  <Navbar />
  <div class="workspace">
    <main>
      <slot />
    </main>
    <ChatPanel />
  </div>
  <Footer />
</div>

<style>
  .app {
    min-height: 100vh;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 22px;
    width: min(1480px, calc(100% - 32px));
    margin: 0 auto;
    padding: 28px 0 42px;
  }

  main {
    min-width: 0;
  }

  :global(.chat) {
    position: sticky;
    top: 92px;
  }

  @media (max-width: 1040px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    :global(.chat) {
      position: static;
    }
  }

  @media (max-width: 760px) {
    :global(.chat) {
      min-height: 260px;
    }
  }

  @media (max-width: 760px) {
    .workspace {
      width: min(100% - 22px, 1480px);
      padding-top: 18px;
    }
  }
</style>
