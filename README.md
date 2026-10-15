# Capy Boom — Arena das Capivaras

Arena shooter 2D online com capivaras. Roda direto no navegador (PC e celular).

## Estrutura

```
public/index.html      jogo pronto (gerado pelo build; é o que vai pro Cloudflare)
src/
  head.html            ajuste de escala para celular
  body.html            telas e ícones SVG
  style.css            visual (cores, botões, HUD, telas)
  js/
    00_util.js         utilidades puras (usadas também pelo servidor)
    01_core.js         configurações e sons sintetizados
    02_data.js         capivaras, 8 modos, 6 mapas e as 67 armas
    03_art.js          desenhos: capivara, armas, projéteis, itens e mapas
    04_game.js         regras do jogo, bots e poderes (a "simulação")
    04_net.js          rede: servidor online (WebSocket) e modo direto P2P de reserva
    05_render.js       câmera, efeitos, partículas, previsão local e laço principal
    06_ui.js           menus, salas online, HUD, Arsenal, votação e controles
server/
  worker.js            Worker: serve o jogo e a API /api/*
  room.js              Durable Object "Room": uma sala = uma partida rodando na nuvem
  lobby.js             Durable Object "Lobby": lista de salas abertas
  sim_glue.js          liga a simulação do jogo à sala
  sim.gen.js           GERADO pelo build (00_util + 02_data + 04_game + sim_glue)
scripts/build.mjs      junta src/ em public/index.html e gera server/sim.gen.js
versoes-antigas/       versões anteriores, só para consulta
```

## Comandos

```
npm run build     gera public/index.html e server/sim.gen.js a partir de src/
npm run dev       build + servidor local do Cloudflare (wrangler dev) com salas online
npm run deploy    build + publica jogo e servidor no Cloudflare
```

Edite sempre os arquivos em `src/` (e `server/`) e rode `npm run build`. Não edite `public/index.html` nem `server/sim.gen.js` direto: eles são sobrescritos a cada build.

## Online

O servidor roda no mesmo Worker do jogo, no Cloudflare (Workers + Durable Objects). Cada sala é um Durable Object que executa a mesma simulação de `04_game.js`. O navegador manda os controles e desenha o estado que o servidor devolve.

- Salas públicas aparecem na lista. Salas privadas só entram com o código de 6 caracteres. A sala pode ter senha.
- O dono escolhe modo, mapa e bots. Se ele sair, outro jogador vira dono. Dá para entrar no meio da partida.
- Na partida, o servidor envia o estado a cada 50 ms, só com o que mudou. A cada 2 s manda um quadro completo. Os controles só saem quando mudam.
- Se a conexão cair, a vaga fica reservada por 20 s e o jogo tenta voltar sozinho.
- Se o servidor não responder, ou o jogo for aberto como arquivo, a tela Online usa o modo direto entre jogadores (P2P).
- No plano gratuito, o Cloudflare inclui 100 mil requisições e 13 mil GB-s de Durable Objects por dia. A sala só fica ligada enquanto tem alguém dentro.

## Controles

- PC: WASD anda, mouse mira e atira, Espaço/Shift dá dash, Q (ou rodinha, 1/2) troca de arma, Tab mostra o placar, Esc pausa.
- Celular: joystick à esquerda, analógico de mira à direita (até a metade mira, empurrando mais atira), botões de dash e troca de arma.
