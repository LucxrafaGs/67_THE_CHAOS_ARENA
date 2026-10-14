# Capy Boom — Arena das Capivaras

Arena shooter 2D online com capivaras. Roda direto no navegador (PC e celular).

## Estrutura

```
public/index.html      jogo pronto (gerado pelo build; é o que vai pro Cloudflare)
src/
  body.html            telas e ícones SVG
  style.css            visual (cores, botões, HUD, telas)
  js/
    01_core.js         utilidades, configurações e sons sintetizados
    02_data.js         capivaras, 8 modos, 6 mapas e as 67 armas
    03_art.js          desenhos: capivara, armas, projéteis, itens e mapas
    04_game.js         regras do jogo, bots e multiplayer (PeerJS)
    05_render.js       câmera, efeitos, partículas e laço principal
    06_ui.js           menus, HUD, Arsenal, votação e controles
scripts/build.mjs      junta tudo de src/ em public/index.html
versoes-antigas/       versões anteriores, só para consulta
```

## Comandos

```
npm run build     gera public/index.html a partir de src/
npm run dev       build + servidor local do Cloudflare (wrangler dev)
npm run deploy    build + publica no Cloudflare
```

Edite sempre os arquivos em `src/` e rode `npm run build`. Não edite `public/index.html` direto: ele é sobrescrito a cada build.

## Controles

- PC: WASD anda, mouse mira e atira, Espaço/Shift dá dash, Q (ou rodinha, 1/2) troca de arma, Tab mostra o placar, Esc pausa.
- Celular: joystick à esquerda, toque na tela para mirar e atirar, botões de dash e troca de arma à direita.
