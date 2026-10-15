/* ==========================================================
   HORTA LIMPA — dados do jogo
   Percentuais: PARA/Anvisa. Regras de agrotóxico: legislação brasileira.
   Edite aqui para mudar culturas, preços, produtos e textos.
   ========================================================== */

const SEASON_DAYS = 7;       // dias por estação (o ano tem 4 estações = 28 dias)
const YEAR_DAYS = SEASON_DAYS * 4;
const HOUR_MS = 7000;        // 1 hora de jogo = 7 segundos reais (um dia ≈ 2 minutos; no ⏩ 2x, 1 minuto)
const DAY_START = 6, DAY_END = 22; // o dia vai das 6h às 22h
const PRAGA_DANO = 1, PRAGA_MORTE = 3;   // dias de praga até danificar / destruir (como no Stardew, tudo muda de um dia para o outro)
const META_MOEDAS = 300;     // meta do ano: juntar moedas vendendo na banca
const START_COINS = 20;
const START_HEARTS = 5;

/* Culturas. dias = dias até a colheita (regando todo dia, como no Stardew Valley). para = fração de amostras irregulares no Brasil. */
const CROPS = {
  alface:   { estacoes: ["primavera", "outono", "inverno"], nome: "Alface",   dias: 2, preco: 2, venda: 5, pragas: ["pulgao", "lesma"], para: null, ano: "Anvisa 2023",
              cor: "#8fd16a", fruto: null },
  couve:    { estacoes: ["primavera", "outono", "inverno"], nome: "Couve",    dias: 3, preco: 2, venda: 6, pragas: ["pulgao", "lagarta"], para: 0.35, ano: "Anvisa 2024",
              cor: "#2f7d32", fruto: null },
  tomate:   { estacoes: ["primavera", "verao"], nome: "Tomate",   dias: 4, preco: 3, venda: 10, pragas: ["moscaBranca", "lagarta", "fungo"], para: 0.35, ano: "Anvisa 2017–2018",
              cor: "#3d8b3d", fruto: "#e2432a", mogi: true },
  pimentao: { estacoes: ["primavera", "verao"], nome: "Pimentão", dias: 4, preco: 3, venda: 11, pragas: ["pulgao", "moscaBranca"], para: 0.80, ano: "Anvisa 2017–2018",
              cor: "#3d8b3d", fruto: "#2e9e2e" },
  cenoura:  { estacoes: ["primavera", "outono", "inverno"], nome: "Cenoura",  dias: 3, preco: 2, venda: 8, pragas: ["lagarta"], para: 0.39, ano: "Anvisa 2017–2018",
              cor: "#5fb84a", fruto: "#f08a24" },
  pepino:   { estacoes: ["verao", "outono"], nome: "Pepino",   dias: 3, preco: 2, venda: 6, pragas: ["fungo", "moscaBranca"], para: 0.46, ano: "Anvisa 2024",
              cor: "#4a9a3c", fruto: "#2f7d32" },
  // culturas das temporadas novas (aparecem só na temporada indicada)
  uva:      { estacoes: ["verao"], nome: "Uva",      dias: 5, preco: 3, venda: 12, pragas: ["fungo", "moscaBranca"], para: 0.28, ano: "Anvisa 2024",
              cor: "#4a9a3c", fruto: "#7b3fa0" },
  milho:    { estacoes: ["verao"], nome: "Milho",    dias: 4, preco: 2, venda: 7, pragas: ["lagarta"], para: 0.03, ano: "Anvisa 2024",
              cor: "#6cb84f", fruto: "#f4c430" },
  cebola:   { estacoes: ["outono", "inverno"], nome: "Cebola",   dias: 3, preco: 2, venda: 7, pragas: ["fungo", "pulgao"], para: 0.13, ano: "Anvisa 2024",
              cor: "#5fb84a", fruto: "#d9a35b" },
  flores:   { estacoes: ["primavera", "verao", "outono", "inverno"], nome: "Cravo-de-defunto", dias: 2, preco: 1, venda: 0, pragas: [], para: null, companheira: true,
              cor: "#4a9a3c", fruto: "#f4a62a" },
};

/* Pragas: como reconhecer e como tratar */
const PESTS = {
  pulgao:      { nome: "Pulgão",       cor: "#a5e05a", icone: "🟢", desc: "Bichinhos verdes que sugam a seiva das folhas.",
                 trata: "🐞 joaninhas · 🌿 calda de neem · ☠️ Inseticida Q ou F" },
  lagarta:     { nome: "Lagarta",      cor: "#6aa832", icone: "🐛", desc: "Come as folhas e os frutos.",
                 trata: "✋ catar à mão · 🌿 calda de neem · ☠️ Inseticida Q ou F" },
  moscaBranca: { nome: "Mosca-branca", cor: "#ffffff", icone: "⚪", desc: "Mosquinhas brancas embaixo das folhas.",
                 trata: "🐞 joaninhas · 🌿 calda de neem · ☠️ Inseticida Q" },
  lesma:       { nome: "Lesma",        cor: "#a1887f", icone: "🐌", desc: "Aparece com umidade e come as folhas.",
                 trata: "✋ catar à mão" },
  fungo:       { nome: "Fungo",        cor: "#c9a63a", icone: "🍂", desc: "Manchas amarelas e marrons nas folhas.",
                 trata: "✂️ podar com a tesoura · ☠️ Fungicida C" },
};

/* Produtos da Loja da Cooperativa.
   tipo: agro (agrotóxico) | alt (alternativa) | epi
   registrado: culturas em que o agrotóxico pode ser usado (está no rótulo).
   carencia: dias que precisa esperar entre a aplicação e a colheita (o jogo conta em dias). */
const PRODUCTS = [
  { id: "inseticidaQ", nome: "Inseticida Q", tipo: "agro", preco: 3, icone: "🧪", cor: "#7b3fa0",
    mata: ["pulgao", "lagarta", "moscaBranca"], registrado: ["tomate", "pimentao"], carencia: 2,
    desc: "Mata na hora. Carência: 2 dias." },
  { id: "inseticidaF", nome: "Inseticida F", tipo: "agro", preco: 3, icone: "🧪", cor: "#b0397a",
    mata: ["pulgao", "lagarta"], registrado: ["couve", "cenoura"], carencia: 2,
    desc: "Mata na hora. Carência: 2 dias." },
  { id: "fungicidaC", nome: "Fungicida C", tipo: "agro", preco: 3, icone: "🧪", cor: "#3f5aa0",
    mata: ["fungo"], registrado: ["tomate"], carencia: 2,
    desc: "Acaba com fungo. Carência: 2 dias." },
  { id: "joaninhas", nome: "Joaninhas", tipo: "alt", preco: 2, icone: "🐞",
    mata: ["pulgao", "moscaBranca"], atraso: 1,
    desc: "Controle biológico: comem pulgão e mosca-branca em 1 hora e protegem as vizinhas. Sem resíduo." },
  { id: "neem", nome: "Calda de neem", tipo: "alt", preco: 1, icone: "🌿",
    mata: ["pulgao", "lagarta", "moscaBranca"], chance: 0.7, carencia: 1,
    desc: "Extrato natural. Nem sempre funciona de primeira. Espere 1 dia e lave antes de colher." },
  { id: "epi", nome: "EPI completo", tipo: "epi", preco: 4, icone: "🥽",
    desc: "Luvas, máscara, óculos, avental e botas. Obrigatório para aplicar agrotóxico. Compra uma vez." },
];

/* Ferramentas gratuitas */
const TOOLS = [
  { id: "mao",     nome: "Mão",     icone: "✋", dica: "Colhe e cata lagarta e lesma" },
  { id: "enxada",  nome: "Enxada",  icone: "⛏️", dica: "Prepara a terra" },
  { id: "regador", nome: "Regador", icone: "💧", dica: "Rega a planta (vale para o dia todo)" },
  { id: "tesoura", nome: "Tesoura", icone: "✂️", dica: "Poda folhas com fungo" },
];

/* Cartões de informação (aparecem uma vez cada). f = fonte */
const FACTS = {
  receita:      { t: "Agrotóxico só pode ser vendido com receita de um agrônomo. Na horta de casa, o melhor é evitar e usar alternativas.", f: "Lei 7.802/1989" },
  semEPI:       { t: "Você aplicou agrotóxico sem EPI e se intoxicou! Em caso de intoxicação, ligue para o Disque-Intoxicação: 0800 722 6001.", f: "Anvisa / Renaciat" },
  naoRegistrado:{ t: "Esse produto não é registrado para essa planta. É a principal irregularidade do Brasil: 12,2% das amostras de 2024 tinham agrotóxico não permitido para a cultura.", f: "Anvisa, análise de 2024" },
  carencia:     { t: "Carência é o tempo de espera entre aplicar e colher. Colher antes deixa resíduo acima do permitido no alimento.", f: "Anvisa" },
  embalagem:    { t: "Embalagem vazia de agrotóxico não vai no lixo comum! Lave 3 vezes e devolva no ponto de recebimento.", f: "Lei 9.974/2000" },
  lixo:         { t: "Embalagem de agrotóxico no lixo comum pode contaminar o solo, a água e intoxicar quem mexe no lixo.", f: "Lei 9.974/2000" },
  devolucao:    { t: "Isso! Embalagem lavada 3 vezes e devolvida ao ponto de recebimento: destino certo.", f: "Lei 9.974/2000" },
  joaninha:     { t: "Controle biológico usa inimigos naturais das pragas, como joaninhas, no lugar do veneno.", f: "Embrapa" },
  flores:       { t: "Plantar flores e culturas diferentes lado a lado (consórcio) atrai inimigos naturais e diminui as pragas.", f: "Agroecologia" },
  colheita:     { t: "Agrotóxico não tem cor, cheiro nem sabor. Só o laboratório mostra se ele está no alimento.", f: "Bordin apud Marins, 2025" },
  chuva:        { t: "Choveu! Toda a horta foi regada hoje.", f: "" },
  praga:        { t: "Apareceu uma praga! Escolha como tratar: catar à mão, joaninhas, calda natural… ou agrotóxico, com todos os cuidados.", f: "" },
};

/* Compromissos finais */
const COMMITMENTS = [
  "Vou lavar frutas e verduras em água corrente com escovinha",
  "Vou olhar o rótulo para saber quem produziu",
  "Vou conhecer um produtor orgânico de Mogi",
  "Vou plantar algo em casa ou numa horta comunitária",
  "Vou contar o que aprendi para alguém da minha casa",
];

const FONTES = [
  "ANVISA. Programa de Análise de Resíduos de Agrotóxicos em Alimentos (PARA) – resultados do ciclo 2024. Brasília, 2025.",
  "ANVISA. Programa de Análise de Resíduos de Agrotóxicos em Alimentos (PARA) – resultados do ciclo 2023. Brasília, 2024.",
  "BRASIL DE FATO. Pepino e laranja são os alimentos campeões de agrotóxicos em nova análise da Anvisa. 2025.",
  "AGÊNCIA PÚBLICA. Laranja, pimentão e goiaba: alimentos campeões de agrotóxicos acima do limite. 2020 (PARA 2017–2018).",
  "BRASIL. Lei nº 7.802/1989 (Lei dos Agrotóxicos) e Lei nº 9.974/2000 (embalagens).",
  "MARINS, L. G. Como lavar frutas e verduras do jeito certo para remover os agrotóxicos? Portal Drauzio Varella, 2025.",
  "IBGE. Produção Agrícola Municipal 2025 – Mogi das Cruzes. 2026.",
  "MAPA. Cadastro Nacional de Produtores Orgânicos – Mogi das Cruzes. 2026.",
  "Questionário do projeto: Percepção do Consumidor em Mogi das Cruzes (n = 57), 2026.",
];

/* ==========================================================
   HISTÓRIA DO JOSÉ LONGUINHO
   ========================================================== */
const STORY = [
  { quem: "narrador", t: "Este é o José Longuinho. Depois de 30 anos na cidade grande, ele cansou do trânsito, da correria e da comida de pacote." },
  { quem: "narrador", t: "José comprou um pedacinho de terra na zona rural de Mogi das Cruzes, no Cinturão Verde, perto de Taiaçupeba." },
  { quem: "jose", t: "Meu sonho é viver do que eu planto: plantar, colher e comer da minha própria horta!" },
  { quem: "jose", t: "Mas eu li que a Anvisa analisou alimentos do país todo e 1 em cada 5 amostras estava irregular. E agrotóxico não tem cor, cheiro nem sabor…" },
  { quem: "jose", t: "Eu nunca plantei nada na vida. Se eu errar no veneno, quem come sou eu! Você me ajuda?" },
];

/* Tutorial guiado: o José explica cada passo.
   ev = evento que conclui o passo; hl = o que piscar na tela. */
const TUTORIAL = [
  { t: "Oi! Primeiro, pegue a ⛏️ enxada na barra lá embaixo.", hl: { slot: "tool:enxada" }, ev: "sel:tool:enxada" },
  { t: "Agora toque na terra marcada para preparar o canteiro.", hl: { tile: [3, 3] }, ev: "hoe" },
  { t: "Boa! Escolha a semente de 🥬 alface na barra.", hl: { slot: "seed:alface" }, ev: "sel:seed:alface" },
  { t: "Toque no canteiro para plantar.", hl: { tile: [3, 3] }, ev: "plant" },
  { t: "Planta precisa de água! Pegue o 💧 regador e regue o canteiro.", hl: { slot: "tool:regador" }, ev: "water" },
  { t: "O relógio começou a andar (canto de cima, à direita). Como no Stardew, as plantas crescem <b>durante a noite</b>: regue uma vez por dia e pronto! Tem o dia todo para explorar. Quando quiser, toque em 🌙 para dormir.", hl: { btn: "sleep" }, ev: "sleep" },
  { t: "Bom dia! A horta cresceu durante a noite. Todo dia de manhã a água acaba: as plantas mostram “💧 Regar”. Regue de novo. Eu almoço às 12h e janto às 19h com o que tiver na despensa: o 🍽️ embaixo do relógio mostra quanta comida eu tenho.", hl: { slot: "tool:regador" }, ev: "allwatered" },
  { t: "As sementes e os tratamentos são vendidos na Cooperativa, na vila. Toque em 🛒 Loja (no canto de baixo, à esquerda) e eu vou até lá.", hl: { btn: "loja" }, ev: "shop" },
  { t: "Na vila moram meus vizinhos: converse com eles, cada um sabe muita coisa! Depois volte para a fazenda, cuide das pragas e colha quando aparecer o ✓.", hl: null, ev: "harvest" },
  { t: "Colheu! Toque na 🧺 cesta da barra (ou no 🚰 tanque) para lavar do jeito certo. Depois o laboratório analisa.", hl: { btn: "deliver", tile: [7, 2] }, ev: "deliver" },
  { t: "Na 🏷️ banca (aqui na fazenda) eu vendo o que sobra e atendo pedidos dos vizinhos. Sem agrotóxico vale mais! Mas guarde comida para mim.", hl: { tile: [0, 6] }, ev: "banca" },
];

/* Comida inicial do José (ultraprocessado) */
const START_PANTRY = 5;

/* Fatos extras da história */
Object.assign(FACTS, {
  ultra:    { t: "Biscoito de pacote não é saída: o Idec encontrou agrotóxico em até 59% dos ultraprocessados testados, e eles nem entram na análise de frutas e verduras da Anvisa.", f: "Idec, 2026" },
  fome:     { t: "Sem comida na despensa, o José fica fraco. Plante o suficiente e colha na hora certa!", f: "" },
  despensa: { t: "O que o laboratório aprova vai para a <b>despensa</b>: é a comida do José. Ele come sozinho <b>1 item no almoço (12h) e 1 no jantar (19h)</b>. Fique de olho no 🍽️ embaixo do relógio e guarde sempre pelo menos 2 itens; venda na banca só o que sobrar. Alimento irregular vai fora.", f: "" },
});


/* ==========================================================
   BANCA, ENCOMENDAS E CONQUISTAS
   ========================================================== */
const SEM_AGRO_BONUS = 1.5;   // alimento sem agrotóxico vende 50% mais caro
const CLIENTES = [
  { nome: "Dona Cida", avatar: "👵🏽", npc: "cida" },
  { nome: "Seu Jorge", avatar: "👨🏾‍🦳", npc: "jorge" },
  { nome: "Seu Kenji", avatar: "👴🏻", npc: "kenji" },
  { nome: "Dra. Lúcia", avatar: "👩🏽‍🔬", npc: "lucia" },
  { nome: "Escola do bairro", avatar: "🏫" },
  { nome: "Restaurante da praça", avatar: "👩🏻‍🍳" },
];
const ACHIEVEMENTS = [
  { id: "colheita",   nome: "Primeira colheita",  icone: "🧺", desc: "Colheu o primeiro alimento" },
  { id: "joaninha",   nome: "Amigo das joaninhas", icone: "🐞", desc: "Usou controle biológico" },
  { id: "catador",    nome: "Mão na massa",       icone: "✋", desc: "Catou 3 pragas à mão" },
  { id: "venda",      nome: "Primeira venda",     icone: "🏷️", desc: "Vendeu na banca" },
  { id: "pedidos",    nome: "Freguesia fiel",     icone: "📦", desc: "Entregou 3 encomendas" },
  { id: "embalagem",  nome: "Lixo no lugar certo", icone: "♻️", desc: "Devolveu embalagem corretamente" },
  { id: "nutrido",    nome: "José bem nutrido",   icone: "😋", desc: "José jantou 5 vezes da horta" },
  { id: "meta",       nome: "Meta batida",        icone: "🪙", desc: "Juntou " + META_MOEDAS + " moedas" },
  { id: "semveneno",  nome: "Horta sem veneno",   icone: "🌿", desc: "Terminou a temporada sem usar agrotóxico" },
  { id: "estrelas",   nome: "Banca de confiança", icone: "⭐", desc: "Chegou a 5 estrelas de reputação" },
  { id: "feira",      nome: "Dia de feira",       icone: "🎪", desc: "Vendeu na feira de sábado" },
  { id: "melhoria",   nome: "Horta melhorada",    icone: "🔧", desc: "Comprou uma melhoria para a horta" },
  { id: "amigo",      nome: "Bom vizinho",        icone: "❤️", desc: "Chegou a 3 corações com um vizinho" },
  { id: "pacote",     nome: "Primeiro pacote",    icone: "📦", desc: "Completou um pacote da Feira Comunitária" },
  { id: "feiraviva",  nome: "Feira restaurada",   icone: "🏛️", desc: "Reconstruiu a Feira Comunitária" },
  { id: "galinha",    nome: "Galinhas felizes",   icone: "🐔", desc: "Recolheu o primeiro ovo" },
  { id: "conserva",   nome: "Conserva caseira",   icone: "🥫", desc: "Fez a primeira conserva" },
  { id: "festival",   nome: "Campeão da festa",   icone: "🎉", desc: "Ganhou um concurso de festival" },
];
Object.assign(FACTS, {
  pragaErrada: { t: "Cada agrotóxico combate pragas específicas. Usar o produto errado não resolve, desperdiça dinheiro e ainda deixa resíduo na planta.", f: "Rótulo e bula do produto" },
  sede:        { t: "Como no Stardew Valley, as plantas crescem <b>de um dia para o outro</b>, mas só se forem <b>regadas uma vez por dia</b>. Planta sem água mostra “💧 Regar”; se passar o dia sem água, ela não cresce e fica com sede. Com sede por vários dias, morre.", f: "" },
  banca:       { t: "Alimento sem agrotóxico vale mais na banca! Mas lembre: o José precisa de comida na despensa para jantar.", f: "" },
});


/* ==========================================================
   REFEIÇÕES E PEDIDOS (ritmo mais rápido)
   ========================================================== */
const MEALS = [{ h: 12, nome: "almoço" }, { h: 19, nome: "jantar" }];
const PEDIDO_HORAS = 8;       // (não usado: cada pedido vale até as 20h do dia seguinte)

/* ==========================================================
   PIA DA COZINHA: como lavar cada alimento (fundamentação: Anvisa 2025; Marins 2025; Yang et al. 2017)
   ========================================================== */
const WASH = {
  folha:  { certo: "Separar folha por folha, lavar em água corrente e deixar de molho no bicarbonato (1 colher de sopa por litro, 15 a 20 min)",
            porque: "Folhas têm muitas dobras onde o resíduo fica. Água corrente tira a sujeira e o bicarbonato ajuda a remover resíduo da superfície." },
  casca:  { certo: "Esfregar com escovinha em água corrente e deixar de molho no bicarbonato (1 colher de sopa por litro, 15 a 20 min)",
            porque: "A casca fina é comida junto. Esfregar e o bicarbonato removem parte do resíduo da superfície, mas não o que entrou no alimento." },
  raiz:   { certo: "Esfregar bem com escovinha em água corrente e raspar ou descascar",
            porque: "Raízes vêm com terra. Escovar e descascar reduzem bastante o resíduo da superfície." },
};
const WASH_KIND = { alface: "folha", couve: "folha", tomate: "casca", pimentao: "casca", pepino: "casca", cenoura: "raiz", uva: "casca", milho: "casca", cebola: "raiz" };
/* Opções erradas ou incompletas que aparecem junto com a certa */
const WASH_WRONG = [
  { t: "Só passar uma água rapidinho", pts: 2, msg: "Ajuda, mas não basta: água corrente tira só parte do resíduo." },
  { t: "Deixar de molho no vinagre", pts: -5, msg: "Vinagre tem efeito limitado: quase não tira agrotóxico." },
  { t: "Lavar com detergente", pts: -15, msg: "Nunca! Detergente pode deixar resíduo tóxico e não tira agrotóxico." },
  { t: "Água sanitária para tirar o agrotóxico", pts: 0, msg: "Água sanitária mata micróbios, mas não é para tirar agrotóxico." },
];

/* ==========================================================
   GUIA: quais alimentos têm mais agrotóxico (Anvisa – PARA; MAPA)
   ========================================================== */
const GUIDE = [
  ["Pimentão", 80, "Anvisa 2017–2018"], ["Pepino", 46, "Anvisa 2024"], ["Goiaba", 42, "Anvisa 2017–2018"],
  ["Laranja", 39, "Anvisa 2024"], ["Cenoura", 39, "Anvisa 2017–2018"], ["Feijão", 37, "MAPA 2020"],
  ["Couve", 35, "Anvisa 2024"], ["Tomate", 35, "Anvisa 2017–2018"], ["Uva", 28, "Anvisa 2024"],
  ["Maçã", 27, "Anvisa 2024"], ["Abobrinha", 26, "Anvisa 2024"], ["Mamão", 21, "Anvisa 2024"],
  ["Aveia", 18, "Anvisa 2024"], ["Cebola", 13, "Anvisa 2024"], ["Banana", 12, "Anvisa 2024"],
  ["Soja", 8, "Anvisa 2024"], ["Pera", 7, "Anvisa 2024"], ["Arroz", 5.2, "Anvisa 2023"],
  ["Milho", 3, "Anvisa 2024"], ["Farinha de trigo", 2, "Anvisa 2024"],
];
const GUIDE_WASH = [
  ["🚿", "Água corrente + escovinha", "Sempre o primeiro passo: tira parte do resíduo da superfície.", "ok"],
  ["🥣", "Molho de bicarbonato", "1 colher de sopa por litro, 15 a 20 min, depois enxaguar. Tira resíduo da casca, não o de dentro.", "ok"],
  ["🔪", "Descascar", "Reduz bastante o resíduo da superfície, mas perde fibras. Lave antes de cortar.", "ok"],
  ["🍳", "Cozinhar", "Degrada parte dos resíduos que não resistem ao calor.", "ok"],
  ["🧪", "Água sanitária", "1 colher de sopa por litro, 15 min: serve para micróbios, não para agrotóxico.", "meio"],
  ["🫙", "Vinagre", "Efeito limitado: quase não tira agrotóxico.", "meio"],
  ["🧴", "Detergente ou sabão", "Nunca! Pode deixar resíduo tóxico.", "bad"],
];
const GUIDE_TIPS = [
  "Não deixe de comer frutas e verduras: a OMS recomenda pelo menos 400 g por dia.",
  "Prefira alimentos da época e com o produtor no rótulo (rastreáveis).",
  "Conheça produtores orgânicos de Mogi: são 17 cadastrados no Ministério da Agricultura.",
];


/* ==========================================================
   O QUE É A PORCENTAGEM (explica a análise da Anvisa)
   ========================================================== */
Object.assign(FACTS, {
  anvisa: { t: "<b>De onde vêm essas porcentagens?</b><br>A <b>Anvisa</b> (Agência Nacional de Vigilância Sanitária), órgão do governo que cuida da segurança dos alimentos, compra frutas, verduras e grãos em mercados de todo o Brasil e testa no laboratório. Esse programa se chama <b>PARA</b> (Programa de Análise de Resíduos de Agrotóxicos em Alimentos).<br><br><b>Irregular</b> quer dizer: agrotóxico acima do limite permitido, ou um agrotóxico que nem podia ser usado naquele alimento.", f: "Anvisa" },
  reputacao: { t: "Quem compra valoriza alimento limpo e produtor de confiança. Cada venda sem agrotóxico e cada pedido entregue aumentam a reputação da banca, e os vizinhos pagam mais.", f: "Questionário do projeto, Mogi das Cruzes (2026)" },
  feira: { t: "Sábado é dia de feira do produtor! As vendas valem 50% mais e os pedidos chegam mais rápido. Planeje a colheita para ter o que vender.", f: "" },
  composteira: { t: "Composteira transforma restos de comida em adubo orgânico: a terra fica mais forte sem precisar de adubo químico.", f: "Embrapa" },
  cisterna: { t: "Cisterna guarda água da chuva para regar: economiza água e a terra fica úmida por mais tempo.", f: "" },
});

/* ==========================================================
   DIAS DA SEMANA E FEIRA
   ========================================================== */
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const FEIRA_DIA = 6;          // dia 6 da temporada = sábado
const FEIRA_BONUS = 1.5;      // vendas valem 50% mais na feira

/* ==========================================================
   REPUTAÇÃO DA BANCA (1 a 5 estrelas): muda o preço de venda
   ========================================================== */
const REP_INICIAL = 2;
const REP_PRECO = [0, 0.9, 1, 1.1, 1.2, 1.35];   // multiplicador por estrelas

/* ==========================================================
   MELHORIAS DA HORTA (Loja)
   ========================================================== */
const UPGRADES = [
  { id: "regadorG",    nome: "Regador grande", icone: "🚿", preco: 20, desc: "Rega o canteiro tocado e os vizinhos (3×3) de uma vez." },
  { id: "canteiros",   nome: "Mais canteiros", icone: "🟫", preco: 25, desc: "A horta cresce: de 4×4 para 5×6 canteiros." },
  { id: "cisterna",    nome: "Cisterna",       icone: "🛢️", preco: 30, desc: "Guarda água da chuva: a rega vale por 2 dias." },
  { id: "composteira", nome: "Composteira",    icone: "🪱", preco: 35, desc: "Adubo orgânico: as plantas crescem mais rápido, sem química." },
  { id: "galinheiro",  nome: "Galinheiro",     icone: "🛖", preco: 30, desc: "Abrigo para até 4 galinhas. Depois compre as galinhas aqui na Cooperativa." },
  { id: "pote",        nome: "Pote de conserva", icone: "🥫", preco: 25, desc: "Transforma alimento lavado em conserva caseira (pronta em 4 horas). Vale mais na banca." },
];

/* ==========================================================
   ESTAÇÕES DO ANO (7 dias cada, em sequência, como no Stardew Valley)
   ========================================================== */
const SEASONS = [
  { id: "primavera", nome: "Primavera", icone: "🌸", desc: "Clima bom para aprender. Tomate, pimentão e verduras.", praga: 1, cresce: 1, agua: 0, chuva: 0.25 },
  { id: "verao",     nome: "Verão",     icone: "☀️", desc: "Calor: mais pragas e a terra seca mais rápido. Chegam 🍇 uva, 🌽 milho e 🥒 pepino.", praga: 1.5, cresce: 1, agua: -2, chuva: 0.35 },
  { id: "outono",    nome: "Outono",    icone: "🍂", desc: "Temperatura amena. Voltam as verduras e chega a 🧅 cebola.", praga: 1, cresce: 0.9, agua: 0, chuva: 0.2 },
  { id: "inverno",   nome: "Inverno",   icone: "❄️", desc: "Frio: as plantas crescem devagar, mas há menos pragas. Planeje a despensa!", praga: 0.6, cresce: 0.75, agua: 1, chuva: 0.15 },
];

/* ==========================================================
   ONDE VOCÊ PERDEU PONTOS: dica para cada tipo de erro
   ========================================================== */
const LOSS_TIPS = {
  sede:       ["💧 Plantas que morreram de sede", "Regue cada planta uma vez por dia (o balão “💧 Regar” avisa)."],
  praga:      ["🐛 Plantas perdidas para a praga", "Trate a praga no mesmo dia: a etiqueta vermelha mostra quantos dias faltam."],
  carencia:   ["⏳ Colheu durante a carência", "Depois do agrotóxico, espere os dias de carência (número roxo) antes de colher."],
  registro:   ["📋 Produto não registrado para a planta", "Leia \"Pode usar em\" na loja: cada agrotóxico só vale para algumas plantas."],
  errado:     ["❌ Produto errado para a praga", "Leia \"Combate\" na loja antes de comprar."],
  semPraga:   ["🚫 Agrotóxico sem praga", "Só trate quando houver praga. Aplicar à toa deixa resíduo."],
  semEPI:     ["🥽 Agrotóxico sem EPI", "Compre o EPI na loja antes de qualquer agrotóxico (ou use as alternativas)."],
  lixo:       ["🗑️ Embalagem no lixo comum", "Leve a embalagem vazia ao ponto de devolução ♻️."],
  esquecida:  ["🗑️ Embalagem esquecida", "Devolva as embalagens antes da temporada acabar."],
  fome:       ["🥣 José passou fome", "Plante alface e couve (rápidas) e guarde comida na despensa."],
  lavar:      ["🚰 Lavou do jeito errado", "Água corrente + escovinha + bicarbonato. Vinagre e detergente não."],
  epoca:      ["🍂 Plantas fora da época", "Antes da troca de estação, veja no 📔 Diário quais plantas são da próxima estação."],
};


/* ==========================================================
   ITENS QUE NÃO SÃO PLANTAS (despensa)
   ========================================================== */
const ITEMS = {
  biscoito: { nome: "Biscoito de pacote", icone: "🍪", venda: 0 },
  ovo:      { nome: "Ovo caipira", icone: "🥚", venda: 5 },
  molho:    { nome: "Molho de tomate caseiro", icone: "🥫", venda: 25 },
  picles:   { nome: "Picles de pepino", icone: "🥫", venda: 15 },
  geleia:   { nome: "Geleia de uva", icone: "🥫", venda: 30 },
};
/* Conservas: o que cada alimento vira no pote (vale 2,5× o alimento) */
const CONSERVAS = {
  tomate: { id: "molho", nome: "Molho de tomate caseiro" },
  pepino: { id: "picles", nome: "Picles de pepino" },
  uva:    { id: "geleia", nome: "Geleia de uva" },
};
const CONSERVA_HORAS = 4;
const CONSERVA_MULT = 2.5;
const GALINHA_PRECO = 8, GALINHAS_MAX = 4;
Object.assign(FACTS, {
  galinhas: { t: "Galinhas soltas no quintal comem lagartas, larvas e insetos: é um controle natural de pragas usado na agroecologia. E ainda dão ovos!", f: "Agroecologia" },
  conserva: { t: "Conserva caseira é comida de verdade, sem os aditivos dos ultraprocessados. Mas atenção: a conserva <b>não tira</b> o agrotóxico. Se o alimento tinha resíduo, a conserva também tem.", f: "Idec, 2026" },
  epoca:    { t: "Cada alimento tem sua época. Fora dela, a planta sofre mais com o clima e com as pragas. Por isso vale preferir alimentos da época, na horta e no mercado.", f: "Guia do projeto" },
  agromax:  { t: "Assim como a Joja Mart do Stardew, a AgroMax é uma empresa grande que vende agrotóxico com propaganda. Desconfie de promessas como “praga nunca mais”: a lei exige receita, rótulo, carência e EPI.", f: "Lei 7.802/1989" },
  feiraComunitaria: { t: "Na feira você conhece quem produz. Comprar de produtores locais e de alimentos da época ajuda a saber de onde vem a comida.", f: "Guia do projeto" },
});

/* ==========================================================
   VIZINHOS DA VILA (amizade e conversas, como no Stardew Valley)
   pos = lugar na vila; ama/gosta = presentes; falas por nível de coração
   ========================================================== */
const AMIZADE_POR_CORACAO = 50, CORACOES_MAX = 5;
const NPCS = [
  { id: "cida", nome: "Dona Cida", avatar: "👵🏽", papel: "vizinha da chácara ao lado", pos: [2, 4], cor: "#c45a8a", pele: "#b07a52", cabelo: "#d9d9d9",
    ama: ["alface", "molho"], gosta: ["couve", "cenoura", "ovo"],
    premio: { tipo: "upgrade", id: "pote", txt: "Tome meu pote de conserva antigo! Minha mãe fazia molho de tomate nele." },
    falas: [
      ["Oi, vizinho! Eu sou a Cida, moro aqui há 40 anos. Meu segredo é lavar bem: água corrente, escovinha e molho de bicarbonato (1 colher de sopa por litro, 15 a 20 minutos).",
       "Vinagre? Minha mãe usava, mas hoje se sabe que ele quase não tira agrotóxico. Serve é de tempero!"],
      ["Nunca lave verdura com detergente, viu? Ele pode deixar resíduo tóxico e não tira agrotóxico.",
       "Folha a gente lava separando folha por folha. Resíduo gosta de se esconder nas dobras."],
      ["Água sanitária é para matar micróbio, não agrotóxico. Cada coisa no seu lugar."],
      ["Descascar ajuda bastante com o resíduo da casca. Mas o que entrou no alimento continua lá."],
      ["Mesmo com tudo isso, não pare de comer verdura! A OMS recomenda pelo menos 400 g de frutas e verduras por dia."],
    ] },
  { id: "kenji", nome: "Seu Kenji", avatar: "👴🏻", papel: "produtor orgânico", pos: [5, 3], cor: "#3d7a4a", pele: "#e0b98f", cabelo: "#555",
    ama: ["cenoura", "cebola"], gosta: ["tomate", "pepino", "uva"],
    premio: { tipo: "itens", prod: { joaninhas: 2 }, seeds: { flores: 2 }, txt: "Leve estas joaninhas e sementes de cravo-de-defunto. São as melhores ajudantes que existem!" },
    falas: [
      ["Meu avô veio do Japão e plantou aqui no Cinturão Verde de Mogi. Hoje eu planto sem veneno: sou um dos produtores orgânicos de Mogi cadastrados no Ministério da Agricultura.",
       "Joaninha é minha melhor funcionária: come pulgão e mosca-branca e não deixa resíduo nenhum."],
      ["Plante flores no meio da horta, como o cravo-de-defunto. Elas atraem os inimigos naturais das pragas.",
       "Não plante tudo igual, lado a lado. Monocultura atrai praga; misturar as culturas protege."],
      ["Galinha solta no quintal come lagarta e bichinho. É o controle natural mais antigo que existe."],
      ["Respeite a época de cada planta. Fora da época ela sofre com o clima e com as pragas."],
      ["Composteira transforma resto de comida em adubo. Terra forte, planta forte, sem química."],
    ] },
  { id: "lucia", nome: "Dra. Lúcia", avatar: "👩🏽‍🔬", papel: "engenheira agrônoma", pos: [5, 6], cor: "#f0f0f0", pele: "#8d5a3b", cabelo: "#2b1a10",
    ama: ["pimentao", "couve"], gosta: ["alface", "tomate", "milho"],
    premio: { tipo: "itens", prod: { neem: 3 }, txt: "Para a sua horta: 3 caldas de neem. Use alternativas antes de pensar em agrotóxico." },
    falas: [
      ["Sou agrônoma. Agrotóxico só pode ser vendido com receita de agrônomo: é a lei (Lei 7.802/1989).",
       "Agrotóxico não tem cor, cheiro nem sabor. Só a análise de laboratório mostra se ele está no alimento."],
      ["Leia o rótulo: cada produto só pode ser usado nas plantas em que é registrado. Em 2024, 12,2% das amostras analisadas pela Anvisa tinham agrotóxico não permitido para aquele alimento.",
       "Carência é o tempo de espera entre aplicar e colher. Colher antes deixa resíduo acima do limite."],
      ["Sem EPI, nada de agrotóxico: luvas, máscara, óculos, avental e botas. Intoxicação? Disque-Intoxicação: 0800 722 6001."],
      ["Embalagem vazia de agrotóxico: lave 3 vezes e devolva no ponto de recebimento. Nunca no lixo comum (Lei 9.974/2000)."],
      ["A Anvisa compra alimentos no mercado e testa no laboratório. Em 2024, cerca de 2 de cada 10 amostras estavam irregulares."],
    ] },
  { id: "jorge", nome: "Seu Jorge", avatar: "👨🏾‍🦳", papel: "feirante", pos: [3, 2], cor: "#e2432a", pele: "#6b4428", cabelo: "#ddd",
    ama: ["tomate", "milho"], gosta: ["alface", "cenoura", "ovo", "picles"],
    premio: { tipo: "bonus", txt: "Vou falar bem de você para todo mundo: seus produtos na banca valem 10% a mais!" },
    falas: [
      ["Esse galpão já foi a Feira Comunitária, o coração da vila. Se a gente juntar alimentos limpos da região, dá para reabrir! Toque no galpão para ver os pacotes.",
       "Na feira eu conheço quem produz. No mercado, quase ninguém sabe de onde veio a comida."],
      ["Pimentão foi campeão: 8 de cada 10 amostras irregulares na análise da Anvisa de 2017–2018.",
       "Prefira alimento da época e com o nome do produtor no rótulo. Assim dá para saber de onde veio."],
      ["Pepino e laranja apareceram entre os campeões de irregularidade na análise de 2024. Por isso eu sempre pergunto ao produtor como ele planta."],
      ["Aquele Marcos da AgroMax quer comprar o galpão da feira. Não deixe, José!"],
      ["Com a feira aberta, a vila inteira come melhor. Obrigado por ajudar!"],
    ] },
  { id: "marcos", nome: "Marcos", avatar: "🧑🏻‍💼", papel: "vendedor da AgroMax", pos: [7, 3], cor: "#2f5fb0", pele: "#e8c4a0", cabelo: "#3a2a1a",
    ama: ["biscoito"], gosta: [],
    premio: { tipo: "itens", prod: { inseticidaQ: 1 }, txt: "Amostra grátis de Inseticida Q! Mas olha, sem EPI não, hein... (risos)" },
    falas: [
      [{ t: "Bem-vindo à AgroMax! Com nossos produtos, praga nunca mais. Rápido, prático, garantido!", nota: "Nenhum produto acaba com as pragas para sempre. E todo agrotóxico tem regras: receita, rótulo, carência e EPI." }],
      [{ t: "Receita de agrônomo? Isso é detalhe...", nota: "Não é detalhe: a lei exige receita de agrônomo para vender agrotóxico (Lei 7.802/1989)." },
       { t: "Esse inseticida serve para tudo!", nota: "Cada produto só é registrado para algumas plantas e pragas. Usar fora do rótulo é a irregularidade mais comum." }],
      [{ t: "Para que esperar carência? Colhe logo e vende!", nota: "Colher antes da carência deixa resíduo acima do limite: o alimento fica irregular." }],
      [{ t: "Embalagem vazia? Joga no lixo, ninguém vê.", nota: "A lei manda lavar 3 vezes e devolver no ponto de recebimento (Lei 9.974/2000)." }],
      [{ t: "Assine o Contrato AgroMax e nunca mais se preocupe com a feira!", nota: "Com o contrato, a Feira Comunitária vira depósito e a AgroMax pulveriza sua horta toda semana." }],
    ] },
];

/* ==========================================================
   FEIRA COMUNITÁRIA: pacotes (como o Centro Comunitário do Stardew)
   Os alimentos precisam estar lavados e SEM agrotóxico.
   ========================================================== */
const BUNDLES = [
  { id: "folhas",    nome: "Pacote das Folhas",    icone: "🥬", itens: [["alface", 2], ["couve", 2]], premio: { moedas: 20 } },
  { id: "raizes",    nome: "Pacote das Raízes",    icone: "🥕", itens: [["cenoura", 2], ["cebola", 1]], premio: { moedas: 20 } },
  { id: "verao",     nome: "Pacote do Verão",      icone: "🍅", itens: [["tomate", 2], ["pimentao", 1], ["pepino", 1]], premio: { moedas: 30 } },
  { id: "festa",     nome: "Pacote da Festa",      icone: "🌽", itens: [["milho", 2], ["uva", 1]], premio: { moedas: 30 } },
  { id: "granja",    nome: "Pacote da Granja",     icone: "🥚", itens: [["ovo", 3]], premio: { moedas: 20 } },
  { id: "conservas", nome: "Pacote das Conservas", icone: "🥫", itens: [["molho", 1], ["picles", 1]], premio: { moedas: 40 } },
];
const CONTRATO_AGROMAX = 60;   // moedas que a AgroMax paga ao assinar

/* ==========================================================
   FESTIVAIS DE MOGI (sábado de cada estação)
   ========================================================== */
const FESTIVALS = {
  primavera: { nome: "Festival das Flores", icone: "🌸", desc: "A praça da vila fica cheia de flores da região.", concurso: ["alface", "couve"], pede: "a verdura mais bonita (alface ou couve)" },
  verao:     { nome: "Festa do Milho Verde", icone: "🌽", desc: "Pamonha, curau e milho cozido na praça.", concurso: ["milho"], pede: "o milho mais bonito" },
  outono:    { nome: "Akimatsuri", icone: "🏮", desc: "A festa de outono da comunidade nipo-brasileira de Mogi das Cruzes.", concurso: ["cenoura", "cebola"], pede: "a melhor raiz (cenoura ou cebola)" },
  inverno:   { nome: "Festa Junina", icone: "🎉", desc: "Junho é inverno no Brasil: bandeirinhas, quadrilha e comida caseira.", concurso: ["molho", "picles", "geleia", "conserva"], pede: "a melhor conserva caseira" },
};
const FESTIVAL_PREMIO = 25;
