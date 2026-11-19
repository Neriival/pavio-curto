# Pavio Curto 💣

Jogo de bombas em grade com campanha, batalha, multiplayer online, loja, magias, equipamentos e editor de fases. Feito em HTML5 + JavaScript puro, sem instalar nada.

## Como abrir

Dê dois cliques em `index.html` (Chrome, Edge ou Firefox). O modo online e as fontes precisam de internet; o resto funciona offline.

## O que tem no jogo

- **Campanha**: 50 fases em 5 mundos (10 por mundo), com o Rei Magma no fim de cada mundo, cada vez mais forte. As fases são montadas pela tabela `WORLD_DEFS` em `js/data/levels.js`. Dá para jogar sozinho ou em co-op local. Os mundos alcançados ficam liberados para começar direto deles.
- **Batalha**: escolha seu personagem, a dificuldade (Fácil, Médio ou Difícil) e de 1 a 3 bots, com personagens sorteados em segredo e sem repetir o seu. Dá para adicionar outra pessoa no mesmo PC, com até 4 participantes no total. Quando o tempo acaba, a arena fecha em espiral.
- **Online**: crie uma sala e mande o código de 5 letras para os amigos.
- **6 personagens elementais**, cada um com um efeito especial:
  ⚡ Faísca (Raio): pavio curto · ⛰️ Bolota (Terra): explosão atravessa bloco · 🔥 Brasa (Fogo): chamas duram mais ·
  💧 Nimbo (Água): imune a queimaduras · ❄️ Geada (Gelo): explosão congela · 🌱 Broto (Planta): regenera e enraíza
- **Vida em números**: de 90 (Faísca) a 140 (Bolota). Bomba tira 35, inimigo 30, magia 20 ou mais (cresce com o nível) e o Rei Magma 60. Os números de dano sobem em cima de quem foi atingido.
- **Loja e perfis**: cada pessoa tem um perfil com moedas 💰, ganhas jogando. Com elas compra magias (e melhora até o nível 10), treino de vida (+10 por nível), equipamentos e roupinhas.
- **Magias**: cada personagem tem a magia do seu elemento: ⚡ Relâmpago, ⛰️ Pedregulho, 🔥 Incendiar, 💧 Tromba d'água, ❄️ Congelar e 🌿 Raízes. Você escolhe o alvo (uma mira 🎯 aparece em cima dele), a magia sobe ao céu, persegue o alvo e cai em cima dele. **Toda magia causa dano** (20 no nível 1, mais a cada nível). Relâmpago, Pedregulho e Tromba d'água ferem na hora. Incendiar, Congelar e Raízes ferem quando o efeito acaba. A recarga é longa, de 16 a 21 s, e as magias de dano puro são as que recarregam mais rápido. Para se defender, use equipamentos e o item de escudo. Na Loja dá para comprar a magia de qualquer personagem e melhorar cada uma até o **nível 10**. Cada nível diminui a recarga e deixa o efeito mais forte, com mais duração, mais dano ou uma área maior.
- **Equipamentos** (tela 🛡️ Equipamento): capacete, armadura, calça, botas e escudo, em 15 materiais, do Pano ao Dragão. Cada peça dá **defesa** (menos dano recebido). As botas dão velocidade, o escudo tem chance de **bloquear** o golpe inteiro e a armadura dá vida extra. As peças aparecem no boneco. Os materiais melhores pedem um **nível da conta**, que sobe com a experiência ganha jogando. As montarias saíram do jogo, e quem tinha comprado recebeu as moedas de volta.
- **Status da conta**: pontos de Vida, Velocidade, Bombas, Alcance e Magia que valem para qualquer personagem do perfil. Dá para redistribuir os pontos à vontade.
- **Desafio do Chefe**: a cada 15 partidas terminadas (Batalha, Campanha ou Online), libera uma luta solo contra o Rei Magma. Vencer dá +3 pontos de status e moedas, e cada chefe vencido deixa o próximo mais forte.
- **Editor de fases**: desenhe fases, teste, salve, use como arena na Batalha e compartilhe por código.

Perfis e fases ficam salvos no navegador (localStorage).

## Controles

| | Andar | Bomba | Magia | Trocar alvo |
|---|---|---|---|---|
| Teclado A | W A S D | Espaço | Q | R |
| Teclado B | Setas | Enter | Shift direito | End |
| Controle | Analógico | A | X | LB / RB |

Com o mouse: clique num personagem para escolher o alvo; clique com o botão direito para escolher e já lançar a magia. Embaixo do tabuleiro também há os botões de magia e de trocar alvo.

`Esc` pausa e `M` liga ou desliga o som. Em **⚙️ Configurações** (no menu) dá para trocar qualquer tecla dos dois teclados. As teclas ficam salvas no navegador.

## Organização do código

```
index.html                 telas (HTML) e ordem de carregamento dos scripts
css/
  base.css                 cores, botões, formulários
  menus.css                menu, seleção de jogadores, online, ajuda
  shop.css                 loja
  editor.css               editor de fases
  game.css                 partida (HUD, tabuleiro, mensagens)
js/
  data/                    DADOS: mude aqui para balancear o jogo
    constants.js           tamanho do mapa, tempos, limites
    characters.js          personagens (atributos e história)
    items.js               itens que caem dos blocos
    shop.js                magias (níveis e dano) e roupinhas
    enemies.js             inimigos
    themes.js              cores dos mundos
    levels.js              fases da campanha
    progress.js            pontos de status da conta e Desafio do Chefe
    equipment.js           dano, equipamentos (15 sets), nível da conta
  engine/                  REGRAS (não depende de tela)
    grid.js                grade, geração de mapas, pontos de início
    game.js                simulação completa da partida
    ai.js                  bots
  render/                  DESENHO
    draw.js                formas básicas
    characters.js          personagens, roupinhas, efeitos de magia
    gear.js                equipamentos no boneco e ícones das peças
    enemies.js             inimigos
    world.js               cenário, bombas, fogo, itens, orbes
  systems/                 SERVIÇOS
    input.js               teclado e controles, teclas personalizadas
    audio.js               sons sintetizados
    net.js                 rede (PeerJS / WebRTC)
    profiles.js            perfis, moedas, compras
    level-store.js         fases salvas, exportar/importar
  ui/                      TELAS
    app.js                 estado global, troca de telas, ficha do personagem
    session.js             laço da partida, comandos, moedas ganhas
    hud.js                 placar e mensagens da partida
    setup.js               seleção local
    online.js              salas online
    shop.js                loja
    stats.js               status da conta e início do Desafio do Chefe
    equip.js               tela de equipamento (comprar e vestir as peças)
    settings.js            configurações: trocar teclas e som
    editor.js              editor de fases
    menu.js                menu principal e ajuda
  main.js                  inicialização
```

### Receitas rápidas

- **Novo personagem**: adicione em `js/data/characters.js` e desenhe o acessório em `drawAccessory` (`js/render/characters.js`).
- **Nova roupinha**: adicione em `COSMETICS` (`js/data/shop.js`) e desenhe em `drawHat` ou `drawFace`.
- **Novo material de equipamento**: adicione em `GEAR_TIERS` (`js/data/equipment.js`). As cores do desenho vêm de lá.
- **Nova magia**: adicione em `SPELLS` e implemente o efeito em `applySpell` (`js/engine/game.js`).
- **Novo inimigo**: adicione em `js/data/enemies.js` e desenhe em `drawEnemy` (`js/render/enemies.js`).
- **Mapa maior ou menor**: mude `COLS` e `ROWS` em `js/data/constants.js` (use números ímpares).

## Jogar online com amigos em outras casas

Cada jogador precisa abrir o jogo. O mais fácil é publicar a pasta de graça (Netlify Drop ou GitHub Pages) e mandar o link. A conexão é ponto a ponto (WebRTC); o servidor público do PeerJS só ajuda os jogadores a se encontrarem.
