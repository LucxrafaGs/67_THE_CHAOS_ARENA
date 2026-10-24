# Capy Boom — Arena das Capivaras

Arena shooter 3D low poly com capivaras. Roda direto no navegador (PC e celular).

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
    03_capy3d.js       capivara 3D: carrega public/models/capivara.glb e anima (parada, andando, dash, arma)
    03_map3d.js        mapas 3D low poly (Three.js): chão, paredes, luz, sombras, água e decoração
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

## Modo local (agora)

- O jogo está DESCONECTADO da rede: `OFFLINE=true` em `src/js/04_net.js`. Nada de Cloudflare, salas online, P2P (PeerJS)
  nem CapyAmigos; os botões de online mostram um aviso. A pasta `server/` e o `wrangler.jsonc` ficaram guardados para depois.
- Three.js e as fontes vêm de `public/vendor/` (nada é baixado da internet).
- Para jogar: `npm run dev` (gera o jogo e abre em http://localhost:8080) ou o Live Server em `public/index.html`.
- Publicar no Cloudflare de novo no futuro: `npm run deploy:cloudflare` (depois de religar o OFFLINE e o PeerJS).

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

## Jogo 3D

- O jogo é só 3D (a versão 2D foi apagada). Os 6 mapas são desenhados em 3D low poly com Three.js (cópia local em `public/vendor`), com luz, sombras em tempo real,
  água animada, folhas balançando, bandeiras, vaga-lumes e neon. Tudo fica em `src/js/03_map3d.js`.
- As paredes 3D ficam EXATAMENTE em cima dos retângulos de colisão de `02_data.js` (`M.walls`): a física, os bots e o
  servidor continuam iguais. Decoração alta (árvores, prédios, palmeiras) só existe em cima das paredes ou fora da arena.
- Vista 3/4: o chão bate pixel a pixel com o canvas de tiros e efeitos que fica por cima; o que é alto "sobe" na tela. Quem fica atrás de uma
  parede aparece levemente através dela (camada da frente meio transparente).
- Configurações > Gráficos controla o 3D: Baixa (sem sombras, material simples), Média, Alta e Caótica (sombras 4096).
- Se o navegador não tiver WebGL aparece um aviso pedindo para ligar a aceleração de hardware (não existe mais modo 2D).
- Ao entrar num mapa aparece "Carregando 3D…" por um instante: os shaders são compilados antes (em paralelo, sem travar o
  navegador) — compilar no meio da partida era o que congelava o Chrome no Mac. Se o jogo ficar lento, a resolução do 3D cai
  sozinha e as sombras passam a atualizar menos vezes.
- As miniaturas de mapa em "Montar partida" são fotos dos mapas 3D em `public/thumbs/`.

## Armas 3D

- As 67 armas são modelos 3D low poly feitos em código, em `src/js/03_guns3d.js` (um modelo por tipo `m` de `02_data.js`).
- A capivara segura o modelo 3D na mão, apontando para a mira (com recuo do tiro e golpe dos corpo a corpo).
- Os ícones do Arsenal, do HUD, da carta de arma nova e do feed de abates são o mesmo modelo 3D, renderizado uma vez e guardado.

## Capivara 3D

- Modelo: `public/models/capivara.glb` (1,3 MB) — a capivara de chapéu de palha. Ela foi re-rigada a partir do arquivo do
  Tripo (`modelos/capivara_chapeu_original.glb`), que vinha com o esqueleto quebrado e um rabo de ornitorrinco (removido:
  os vértices do rabo são recolhidos para dentro do corpo). Para refazer: `python3 scripts/rig_capivara.py` (numpy e pillow).
- Poeirinha no chão a cada passo, no dash e quando ela aterrissa de um pulinho (cor da poeira muda por mapa).
- Ao recarregar a página (o Live Server recarrega a cada arquivo salvo) a placa de vídeo é liberada na hora.
- Animações procedurais em `src/js/03_capy3d.js`: parada (respira, pisca, olha pros lados, mexe orelha e rabinho e às vezes
  faz uma gracinha: pulinho, dancinha, olhada dupla, abana o rabo, se espreguiça), andando (passinhos e rebolado), dash
  (inclina e estica), recuo do tiro, golpe corpo a corpo e o amassadinho ao levar dano.
- Ela segura a arma 3D com os bracinhos levantados, virada para onde mira.
- Câmera inclinada (50°) estilo Brawl Stars. Quem fica atrás de parede aparece como silhueta colorida.
- A cor do corpo segue a cor escolhida na personalização; bots ficam mais claros e com um alvo na barriga.

## Efeitos 3D

- Tiros, explosões, fogo, faíscas, fumaça, anéis de impacto, raios da Tesla, laranjinhas, kits médicos, caixas, meteoro e
  carimbo são 3D low poly (`src/js/03_fx3d.js`), desenhados com InstancedMesh (centenas de cópias numa chamada só).
- Os 49 tipos de projétil têm modelo próprio (foguete, melancia, pato, galinha, chinelo, pizza, bolha…); os tiros de texto
  (NÃO, SIM, PEW, 6 e 7) viram plaquinhas em pé. Explosão = clarão + bolas de fogo que sobem e viram fumaça + onda de choque + pedacinhos.
- Só os textos (KABUM, -20, KO!) e o HUD continuam no canvas 2D por cima.

## Menus

- Tudo acontece na tela inicial: a capivara 3D fica num deque sobre a lagoa e as abas de cima (Q/E) trocam o painel da
  direita — Início, Visual (cor do pelo), Arsenal (a capivara segura a arma escolhida) e Fundo. A capivara desliza para o lado.
- Botão branco CONTRA BOTS (Tab) abre o painel de montar a partida; o amarelo JOGAR! (Enter) abre o painel online
  (partida rápida, sala personalizada ou entrar com código — no modo local ele avisa que o online está desligado).
- Fundo: lagoas de várias cores (só a roxa tem vitórias-régias) ou quadros de capivara (`public/loading/`).
- Abertura com a logo Entre Mundos Studio enquanto o jogo carrega; antes de cada partida, uma tela de carregamento de
  pelo menos 5 s com os quadros de capivara, dicas e a cabecinha de capivara enchendo (o mapa 3D é montado por trás).
- XP, vitórias e desafios do dia ficam guardados no navegador.

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
