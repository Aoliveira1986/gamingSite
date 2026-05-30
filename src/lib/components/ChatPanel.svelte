<script lang="ts">
  type Message = {
    id: number;
    user: string;
    text: string;
    time: string;
    tone: 'system' | 'player';
  };

  let username = `Player${Math.floor(100 + Math.random() * 899)}`;
  let draft = '';
  let messages: Message[] = [
    { id: 1, user: 'GameZone', text: 'Lobby online. Chat local pronto para Socket.IO.', time: '20:31', tone: 'system' },
    { id: 2, user: 'Nova', text: 'Cube Runner está rápido hoje.', time: '20:32', tone: 'player' },
    { id: 3, user: 'Orbit', text: 'Quero ver o Space Dodge quando sair.', time: '20:33', tone: 'player' }
  ];

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    const message: Message = {
      id: Date.now(),
      user: username.trim() || 'Player',
      text,
      time: new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date()),
      tone: 'player'
    };

    messages = [...messages, message].slice(-30);
    draft = '';
  }
</script>

<aside class="chat" aria-label="Chat da comunidade">
  <header>
    <div>
      <span class="eyebrow">Live lobby</span>
      <h2>Chat</h2>
    </div>
    <span class="online">24</span>
  </header>

  <label class="name-field">
    <span>Nome</span>
    <input bind:value={username} maxlength="18" aria-label="Nome de utilizador" />
  </label>

  <div class="messages" aria-live="polite">
    {#each messages as message}
      <article class:system={message.tone === 'system'}>
        <div>
          <strong>{message.user}</strong>
          <time>{message.time}</time>
        </div>
        <p>{message.text}</p>
      </article>
    {/each}
  </div>

  <form on:submit|preventDefault={sendMessage}>
    <input bind:value={draft} maxlength="140" placeholder="Escreve uma mensagem..." />
    <button type="submit" aria-label="Enviar mensagem">Enviar</button>
  </form>
</aside>

<style>
  .chat {
    display: grid;
    grid-template-rows: auto auto minmax(190px, 1fr) auto;
    gap: 14px;
    min-height: 520px;
    max-height: calc(100vh - 112px);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 16px;
    background: rgba(10, 15, 27, 0.84);
    box-shadow: var(--shadow);
    backdrop-filter: blur(16px);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 2px 0 0;
    font-size: 1.08rem;
  }

  .eyebrow,
  .name-field span {
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .online {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 30px;
    border-radius: 999px;
    background: rgba(114, 245, 159, 0.13);
    color: var(--green);
    font-weight: 900;
  }

  .name-field {
    display: grid;
    gap: 6px;
  }

  input {
    width: 100%;
    min-height: 40px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 8px;
    padding: 0 12px;
    background: rgba(2, 6, 23, 0.72);
    color: #eef7ff;
    outline: none;
  }

  input:focus {
    border-color: rgba(34, 211, 238, 0.7);
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
    padding-right: 2px;
  }

  article {
    border-left: 2px solid rgba(34, 211, 238, 0.68);
    border-radius: 7px;
    padding: 10px;
    background: rgba(15, 23, 42, 0.66);
  }

  article.system {
    border-left-color: rgba(251, 191, 36, 0.82);
  }

  article div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #eff6ff;
    font-size: 0.82rem;
  }

  time {
    color: #7f91a8;
    font-size: 0.72rem;
  }

  p {
    margin: 5px 0 0;
    color: #b8c5d6;
    font-size: 0.9rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  button {
    min-height: 40px;
    border: 0;
    border-radius: 8px;
    padding: 0 12px;
    background: var(--cyan);
    color: #04111a;
    font-weight: 900;
  }

  @media (max-width: 1040px) {
    .chat {
      min-height: 360px;
      max-height: none;
    }
  }
</style>
