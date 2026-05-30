# GameZone 3D

Portal moderno de jogos 3D em browser criado com SvelteKit, TypeScript e Three.js.

## Como correr

```bash
npm install
npm run dev
```

Depois abre o URL indicado pelo terminal, normalmente:

```text
http://localhost:5173
```

## Scripts

```bash
npm run dev      # servidor local
npm run check    # valida Svelte + TypeScript
npm run build    # build de producao
npm run preview  # preview do build
```

## O que esta implementado

- Pagina inicial moderna com hero, CTA e jogos em destaque.
- Catalogo em `/games`.
- Rotas individuais em `/games/[slug]`.
- `Cube Runner 3D` em `/games/cube-runner`.
- `Space Dodge 3D` em `/games/space-dodge`.
- `Arena Ball 3D` em `/games/arena-ball`.
- `Neon Flight 3D` em `/games/neon-flight`.
- `Brick Breaker 100` em `/games/brick-breaker-100`.
- `Space Invaders 100` em `/games/space-invaders-100`.
- `Super Platformer 100` em `/games/super-platformer`.
- Chat local com visual old school moderno, pronto para futura ligacao via Socket.IO.
- Layout responsivo desktop/mobile.
- Thumbnails geradas em CSS, sem dependencia de imagens externas.
- Estrutura modular em `src/lib/components` e `src/lib/games`.

## Controlos

- `WASD` ou setas: movimento.
- `Espaco`: salto, impulso ou boost, dependendo do jogo.
- `Espaco`: tambem dispara no `Space Invaders 100`.
- `Enter`: recomecar quando o jogo nao esta a correr.
- Botao `Recomecar`: reinicia a partida ativa.

## Como adicionar novos jogos

1. Adiciona uma entrada em `src/lib/games/games.ts` com `id`, `name`, `description`, `category`, `thumbnail`, `route`, `status` e `accent`.
2. Cria a implementacao do jogo dentro de `src/lib/games/NomeDoJogo`.
3. Em `src/routes/games/[slug]/+page.svelte`, instancia o novo motor quando `data.game.id` corresponder ao novo `id`.
4. Mantem o padrao dos motores atuais: `start()`, `restart()` e `dispose()` para limpar Three.js, listeners e `requestAnimationFrame`.

## Estrutura principal

```text
src/
  lib/
    components/
      ChatPanel.svelte
      Footer.svelte
      GameCard.svelte
      GameLayout.svelte
      Navbar.svelte
    games/
      games.ts
      Arcade3D/
        Arcade3DGame.ts
        types.ts
      ClassicArcade/
        ClassicArcadeGame.ts
        types.ts
      CubeRunner3D/
        CubeRunnerGame.ts
        types.ts
  routes/
    +layout.svelte
    +page.svelte
    games/
      +page.svelte
      [slug]/
        +page.ts
        +page.svelte
```
