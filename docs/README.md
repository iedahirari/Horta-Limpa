# Horta Limpa: guia técnico da pasta `docs`

Esta pasta é o jogo em si, publicado pelo GitHub Pages. Para a história, a fundamentação teórica, os dados da Anvisa e as referências, veja o [README principal](../README.md).

## Como rodar localmente
Abra `index.html` no navegador. Não precisa instalar nada.

## Como publicar
Em **Settings → Pages → Deploy from a branch**, escolha a branch `main` e a pasta **`/docs`**, e clique em **Save**.
Link do jogo: https://iedahirari.github.io/Horta-Limpa/

## Arquivos

| Arquivo | O que tem | Quando editar |
|---|---|---|
| `index.html` | Página principal e tela de rotação do celular | Quase nunca |
| `style.css` | Visual: HUD, barra de ferramentas, loja, modais | Para mudar cores e layout |
| `data.js` | **Todo o conteúdo do jogo** | Para mudar culturas, pragas, produtos, textos, falas e estações |
| `game.js` | Motor do jogo: mundo isométrico (Canvas 2D), fazenda, vila, câmera, HUD, Raio-X e tela final | Para mudar comportamento e regras |

### O que editar em `data.js`
- **Culturas (`CROPS`):** estações em que cada uma é vendida, dias até a colheita, preço, pragas e % de amostras irregulares da Anvisa (`para`).
- **Pragas (`PESTS`):** nome, descrição e formas de tratamento.
- **Produtos (`PRODUCTS`):** preço, pragas combatidas (`mata`), culturas em que pode ser usado (`registrado`), carência em dias (`carencia`), chance de funcionar (`chance`, só para alternativas) e tempo de ação (`atraso`, em horas). Esses campos aparecem na prévia da Loja.
- **Estações (`SEASONS`):** descrição, clima, chuva e `meta`, o objetivo mostrado quando a estação começa.
- **Guia (`GUIDE`, `GUIDE_WASH`, `GUIDE_TIPS`, `GUIDE_CONCEITOS`):** ranking da Anvisa, passos de lavagem, dicas e o glossário de termos (carência, registro, EPI etc.).
- **Velocidade do relógio:** `HOUR_MS` (ms por hora de jogo; hoje 42000, ou seja, 42 segundos por hora, o mesmo ritmo do Stardew Valley) e `SEASON_DAYS` (dias por estação). A mensagem do tutorial usa esse valor automaticamente.

## Controles

**Computador**
- Clique no tile com o item escolhido na barra, ou use as teclas **1 a 0** (ou a roda do mouse).
- Atalhos: **E** inventário, **J** diário, **M** mapa, **G** guia, **P** pausa, **Esc** menu.
- Zoom com **＋** e **－**; arraste para mover a câmera.
- No tanque, **💡 Ver o jeito certo** destaca a lavagem recomendada, sem pontos.

**Celular**
- O jogo pede para girar o aparelho e usa a tela deitada. No Android ele tenta girar sozinho em tela cheia; no iPhone mostra um aviso.
- Toque no tile, arraste para mover o mapa e use **＋** e **−** para o zoom.
- Quem preferir jogar em pé pode tocar em "Prefiro jogar em pé".

## Tutorial (teste inicial)
Depois da história, o jogo pergunta se o jogador quer fazer o **tutorial**, que é um teste inicial para aprender a jogar (cerca de 5 minutos). Quem já sabe jogar pode escolher **Pular tutorial**, e o botão **Pular tutorial** também aparece na barra durante o tutorial. O tutorial aparece na barra como "🎓 Tutorial (teste inicial) · passo X de Y".

## Progresso
O progresso fica salvo no navegador (`localStorage`). Ao reabrir o jogo, aparece "Continuar".

## Pontuação
A tabela completa de pontos está no [README principal](../README.md#pontuação).

## Verificação rápida depois de editar
Antes de publicar, confira a sintaxe dos arquivos com:
```
node --check docs/data.js
node --check docs/game.js
```
Depois, abra `index.html` e teste a Loja, o tanque e a troca de estação.
