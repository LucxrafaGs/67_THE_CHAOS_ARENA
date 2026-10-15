# Capy Boom — Arena das Capivaras

Arena shooter 2D online com capivaras. Roda direto no navegador (PC e celular).

## Estrutura

```
public/index.html      jogo pronto (gerado pelo build; é o que vai pro Cloudflare)
public/manifest.webmanifest + icon-*.png + apple-touch-icon.png   ícone e dados do app na tela inicial do celular
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
    07_social.js       CapyAmigos: amigos por código, online/visto por último, mensagens
server/
  worker.js            Worker: serve o jogo e a API /api/*
  room.js              Durable Object "Room": uma sala = uma partida rodando na nuvem
  lobby.js             Durable Object "Lobby": lista de salas abertas
  social.js            Durable Object "Social": contas, amigos e mensagens (SQLite)
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

- O servidor roda no Cloudflare (Workers + Durable Objects, plano gratuito). Cada sala é um Durable Object
  que roda a MESMA simulação do jogo (`04_game.js`); os navegadores só mandam os controles e desenham o estado.
- Salas: públicas (aparecem na lista) ou privadas (só com o código), com ou sem senha. O dono configura modo,
  mapa e bots; se ele sair, outro jogador vira dono. Dá para entrar no meio da partida.
- Se a conexão cair, o jogo tenta voltar sozinho por ~20 s sem perder a vaga.
- No site publicado o jogo sempre usa o servidor. O modo direto P2P antigo só aparece quando o jogo é aberto como arquivo local.
- Cota grátis do Cloudflare: 100 mil requisições e 13 mil GB-s de Durable Objects por dia. Uma sala usa ~1 req/s
  por jogador e fica "acordada" só enquanto tem gente — sobra bastante para jogar com os amigos.

## CapyAmigos

- Cada navegador ganha uma conta automática com um código de 6 letras (guardada no navegador: limpar os dados do site cria uma conta nova).
- Adicione amigos pelo código; a lista mostra quem está online, onde está (menu, saguão, partida) e quando foi visto pela última vez.
- Dá para conversar na tela inicial, no saguão e durante a partida (botão de conversa no HUD), e entrar na sala de um amigo direto pelo chat.
- As mensagens ficam guardadas por 30 dias.

## Progresso na partida

- Laranjinhas são XP: 67 sobem um nível (vida cheia + uma carta de poder).
- Ao eliminar alguém, você rouba todas as laranjinhas que ele estava carregando (na Corrida 67, elas contam para a vitória).
- A cada 3 eliminações você também ganha uma carta de poder.

## App no celular

No navegador do celular, use "Adicionar à tela inicial": o jogo ganha o ícone da capivara e abre em tela cheia, como um app.

## Controles

- PC: WASD anda, mouse mira e atira, Espaço/Shift dá dash, Q (ou rodinha, 1/2) troca de arma, Tab mostra o placar, Esc pausa.
- Celular: joystick de movimento no canto inferior esquerdo; analógico de mira no canto inferior direito (até a metade mira, empurrando mais atira); dash acima da mira e troca de arma acima do dash.
