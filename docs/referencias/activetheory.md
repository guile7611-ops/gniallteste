# Referência: Active Theory

- **URL:** https://activetheory.net (home) e https://activetheory.net/work
- **Analisado em:** 2026-11-05, no navegador do Claude. Desktop 1280×720 e ~977×854 (GPU AMD RX 580), emulação mobile 375×812 (UA Android, toque, DPR 2), com `prefers-reduced-motion: reduce` ativo.
- **Capturas:** `activetheory/` (numeradas na ordem da experiência).
- **O que é:** site do estúdio Active Theory (LA, NYC, Amsterdã). Fundado em 2012, segundo o próprio site. Faz sites, instalações, XR, jogos e multiplayer. A home e o portfólio são uma única cena WebGL contínua.

> **Como ler este documento.** **Verificado** = visto na tela, no DOM, na rede ou no código carregado. **Hipótese** = inferência a partir de indícios, sempre marcada como tal. **Não verificado** = o que não consegui inspecionar (ver "Limitações").

## A ideia central

Uma única cena 3D, com câmera contínua, em vez de páginas. A home, o portfólio, o detalhe do projeto e o contato são estados da mesma cena. A rolagem é a câmera; trocar de rota é mover a câmera ou recompor objetos, nunca recarregar.

Há uma segunda ideia, menos óbvia: **a navegação é uma conversa**. O filtro do portfólio é um painel de chat ("What are you looking for?"), e o texto do detalhe do projeto entra como mensagens digitadas.

A metáfora é menos unificada que a do igloo.inc. Vidro iridescente, partículas, uma coluna vertebral, uma máquina-reator, uma floresta: os objetos mudam a cada cena. O que dá unidade é o **material** (vidro com refração e franjas cromáticas, luz com bloom) e a **continuidade da câmera**, não um conceito único. Para a Gniall, esse é o ponto que **não** se copia: aqui cada objeto precisa sair da matriz, da tag ou do nó.

## Sequência da experiência

| # | Momento | O que acontece | Captura |
|---|---|---|---|
| 0 | Carregamento | Círculo preenchido de baixo para cima com caracteres ASCII (`/` e dígitos aleatórios) e contador (`/11`, `/65`, `/75`). Tudo em texto DOM. | `00` |
| 1 | Fim do carregamento | Curvas de luz azul em WebGL (com bloom) surgem em volta do círculo; no centro aparece um botão circular `>>>`. A entrada acontece sozinha ou ao passar o cursor. | `01`, `02` |
| 2 | Home | Cena escura. Um anel de vidro com bordas iridescentes envolve o símbolo da AT, sobre um tubo de vidro torcido. Rótulo "SCROLL DOWN". Navegação em pílula no canto: `WORK —— CONTACT` (a linha entre os dois ondula). | `03` |
| 3 | Rolagem | A câmera desce. Contas de vidro coloridas explodem em partículas; depois poeira verde e amarela, neblina volumétrica azul e o contorno de uma floresta. | `04`–`06` |
| 4 | Hero | "CREATIVE DIGITAL EXPERIENCES" em texto WebGL enorme; o anel passa na frente e **refrata o texto**. Coluna à direita: "Founded in 2012 / We blend story, art & technology…". | `07` |
| 5 | Entrada no portfólio | Continuando a rolagem, a URL muda sozinha para `/work`. | — |
| 6 | Portfólio | Cards de vidro arredondados com o vídeo do projeto como textura e o título em texto WebGL, girando em volta de uma coluna vertebral iridescente. Partículas descem dos cards até uma máquina-reator com cabos numa plataforma. À esquerda, o painel de chat com os filtros. | `08`–`10` |
| 7 | Hover no card | O card cresce, a descrição some e o cursor vira ponteiro (não há cursor customizado). | `11`, `12` |
| 8 | Filtro | Clicar em "-> websites" marca o item (recuado, branco). Os cards se desfazem em partículas, a coluna aparece e os cards se refazem só com os projetos filtrados. **A URL não muda.** No card filtrado (Toonami), o hover mostrou uma lista de faixas. | `15`–`17` |
| 9 | Detalhe | Rota própria (`/work/<slug>`, o título da aba muda). O card vai para o centro, o fundo vira textura cinza arranhada e o painel esquerdo "digita" as mensagens letra a letra: título, "2020 / U.S. Airforce / game", descrição, links "Medium Case Study", "Project Link" e "<- Close". "SCROLL TO CLOSE" no topo; rolar volta para `/work`. | `13`, `14` |
| 10 | Contato | Overlay **sem URL própria**; a navegação vira `WORK —— CLOSE ✕`. "✦ CONTACT US ✦" e "LAX → NYC → AMS" em texto WebGL que entra decodificando (ex.: "L8X N7C A6S"). Globo em wireframe, ícones sociais, links (Privacy, Newsletter, Careers), e-mail e um QR code "[ MOBILE SYNC ]". | `18`, `19` |
| — | Música | Player no canto (`<< ARTISTA – FAIXA >>`, com letreiro rolando). Uma faixa aleatória é baixada a cada visita. | `15` (canto superior direito) |
| — | Mobile | A mesma cena, adaptada: o chat desce para a base, os cards ficam empilhados e o card ao lado aparece cortado na borda, sem rolagem horizontal. Efeitos reduzidos (ver "Técnica"). | `20`–`22` |

## Linguagem visual

- **Paleta escura com cor vinda da luz:** fundo quase preto esverdeado ou azulado. A cor vem das franjas cromáticas do vidro, do bloom e das partículas, além do roxo do painel de chat. Cada projeto tem uma cor de UI própria no CMS (campo `uiColor`).
- **Tipografia:** NB Architekt Std (geométrica, técnica, caixa alta) no DOM e no WebGL, que usa um atlas MSDF da mesma fonte.
- **Interface mínima nos cantos:** pílula de navegação no topo direito, chat à esquerda, música abaixo da navegação. O centro é sempre do objeto 3D.
- **Vocabulário de código discreto:** setas `->` e `<-`, `>>>`, `[ MOBILE SYNC ]`, contadores `/65`, texto que decodifica, texto digitado como terminal.
- **Material protagonista:** vidro com refração, reflexo e aberração cromática; luz com bloom e lens streak.
- **Ritmo:** loader → objeto único → transição com partículas → coleção → detalhe. As transições (explosão em partículas, filtro se desfazendo e refazendo) são o momento "absurdo".

## Técnica observada

### Verificado

- **Motor próprio ("Hydra"), não three.js.** Globais `Hydra`, `HydraObject`, `HydraCSS`, `HydraBloom` e 6 web workers `hydra-thread.js` (o mesmo número que `navigator.hardwareConcurrency` na máquina testada). O código só usa three.js se ele existir (`window.THREE ? new THREE.PerspectiveCamera(...) : new PerspectiveCamera(...)`), e three.js não está carregado. Não há strings de GSAP, Lenis nem WebGPU no bundle.
- **Theatre.js presente** (globais e 41 ocorrências no `app.js`), ao lado de um sistema próprio de ajuste e linha do tempo (`uil.json`, "TweenUIL").
- **Bundles:** `app.<hash>.js` (~1,8 MB descomprimido, ~340 KB transferidos) e `modules.<hash>.js`.
- **172 shaders num arquivo só** (`/assets/shaders/compiled.vs`, 267 KB, ~39 KB transferidos), separados por `{@}nome{@}`. Os nomes revelam o que a cena faz:
  - **Partículas GPGPU:** Antimatter*, Proton*, splineparticles, LogoParticleShader…
  - **Simulação de fluido:** advection, divergence, pressure, vorticity, splat, curl, mousefluid.
  - **Vidro:** CleanRoomGlass, GlassInner, GlassReflection.
  - **Cenas:** Home*, Work* (WorkItem, WorkTube, WorkDetailCube…), SpineShader, ChainShader, Tree*.
  - **Transição:** FXScrollTransition.
  - **Pós-processamento:** HydraBloom, UnrealBloom, LensFlare, LensStreak, FXAA, VolumetricLight, radialblur, rgbshift, gaussianblur.
  - **Iluminação:** PBR, AreaLights, sombras, matcap, fresnel.
  - **Texto:** msdf, Text3D, GLUIBatchText.
  - **XR:** controles de VR, GazeSelector, ARCameraQuad.
  - **Cenas que existem no código mas não encontrei navegando:** CleanRoom*, Lab*, Room/Wall/Floor. (O About foi visto depois; ver "About" no fim.)
- **Níveis de qualidade por GPU.** Um módulo `GPU` identifica a placa pela string do renderizador (`matchGPU`, `BLOCKLIST`) e atribui `TIER` 0–5 no desktop e `MT0`–`MT5` no mobile. Um objeto `Tests` liga ou desliga cada efeito a partir desses níveis. Medido na mesma máquina:

  | Ajuste | Desktop (TIER 4) | Emulação mobile |
  |---|---|---|
  | Partículas | 524.288 | 16.384 |
  | Bloom / lens streak | sim / sim | não / não |
  | Luz volumétrica | sim | não |
  | Tubos interativos | sim | não |
  | Corrente (`hideChain`) | visível | oculta |
  | Música | sim | não (`noMusic`) |
  | Limite de FPS | nenhum | 30 |
  | Canvas | 1× DPR | 2× DPR (750×1624) |

  As regras estão no código. Exemplos: partículas vão de 16.384 a 1.048.576 conforme o nível; o bloom só liga a partir do nível 3; a luz volumétrica exige WebGL2.
- **Decodificadores de assets:** Draco (`draco_decoder.wasm`, 64 KB) e Basis/KTX2 (`basis_transcoder.wasm`, 183 KB) são baixados. O código cita Draco 49 vezes, Basis 12 e KTX2 2.
- **Fonte:** NB Architekt Std em woff2 (DOM) e em `.json` (dados de atlas MSDF para o texto no WebGL).
- **CMS em JSON** no Google Cloud Storage (`.../cms/projects-dev.json`, `contact-dev.json`, `metadata-dev.json`). São 65 projetos, com os campos `name`, `slug`, `description`, `clientName`, `completionDate`, `projectLogo` (tamanhos responsivos), `video` (mp4 de ~8 MB com miniatura), `uiColor`, `tags` (uma string), `priority`.
- **Vídeo:**
  - **Reel:** `reel.mp4` (~18 MB, 960×540, em loop sem som) usado como textura.
  - **Projetos:** só o vídeo do card em foco é carregado como textura (ex.: 1280×720), com 3 elementos `<video>` ao todo.
- **Música:** uma faixa aleatória por visita (MP3 de ~1,5 MB), com player próprio (letreiro, anterior e próxima). Não existe elemento `<audio>`.
- **DOM mínimo:** 83 a 107 elementos. O `body` tem `overflow: hidden` e a rolagem é virtual (`scrollTop` sempre 0). A camada `.FXScroll` captura roda e toque, e o cursor de ponteiro vem de raycast na cena.
- **Ritmo da rolagem (visto no JS deles em 2026-11-06, para a D-016):** o `ScrollController` faz `position = Math.lerp(scrollTop, position, LERP)` com `LERP = 0.1`: a cada quadro, a posição anda 10% do que falta. O `Math.lerp` deles corrige o fator pela taxa de quadros (`1 - exp(log(1 - alpha) * FRAME_HZ_MULTIPLIER)`). A cena desenha todo quadro e o shader da transição recebe o progresso e a velocidade. No teclado, o passo é uma animação de 400 ms (easeOutCubic).
- **Camada de acessibilidade paralela (`.GLA11y`):**
  - **Os links:** `<a>` reais com `aria-label` e `tabIndex=0`, posicionados **atrás** do canvas (z-index −1). Eles espelham a navegação ("Toggle Audio", "Work", "Contact"), os projetos (com URLs reais, como `/work/xbox-museum`) e o contato (cidades por extenso, e-mail, redes, Privacy, Careers).
  - **Teclado:** Tab percorre esses links, e Enter em "Contact" abre o overlay.
  - **O que ela não cobre:** o texto do hero ("Creative Digital Experiences") **não** existe no DOM nem nessa camada.
- **SEO por rota no servidor:**
  - **Primeira carga:** cada URL devolve HTML com `title`, `description`, `canonical` e Open Graph corretos (ex.: `/work/xbox-museum` → "20 Years of Xbox · Active Theory"). O `body` traz só um `<noscript>` "Please enable javascript".
  - **Navegação no cliente:** o `document.title` muda, mas o `canonical` fica sempre na home.
- **Outros:**
  - `qrious.js` gera o QR "Mobile Sync";
  - o banner de cookies consulta geolocalização (Cloud Function) para detectar o EEE;
  - o Google Analytics enviou eventos **antes** de qualquer escolha no banner.
- **Chat:** o `app.js` tem um módulo `InteractAIGPT` com uma chamada para `api.openai.com/v1/chat/completions` e uma chave de exemplo (`sk-XXXX…`).
- **Classes CSS** no padrão `go123456789`, típico de CSS-in-JS gerado em tempo de execução.

### Hipóteses (não confirmadas)

- **Assets 3D carregados nos workers:** não vi requisições de `.drc`, `.ktx2` ou `.glb`, embora os decodificadores tenham sido baixados. O mais provável é que os workers façam essas requisições, e a ferramenta de rede não as captura.
- **Cor dos cards:** os cards têm molduras de cores diferentes e o campo `uiColor` existe, mas não confirmei que uma coisa vem da outra.
- **CMS:** a estrutura das mídias (prefixo, `filename`, `mimeType`, `filesize`, `sizes`) lembra o Payload CMS. Pode ser outro sistema.
- **CSS-in-JS:** o padrão de classe sugere a biblioteca goober. Não confirmei.
- **Chat:** a chave no código é de exemplo, então as respostas provavelmente passam por um backend próprio. Não enviei mensagem para confirmar.
- **Uso do Theatre.js:** provavelmente coreografa câmera e transições junto com o "TweenUIL", mas não identifiquei quais animações usam qual.

## Comportamento medido (acessibilidade, movimento, som)

- **Movimento reduzido:** ignorado. Não há a string `prefers-reduced-motion` no código; o `matchMedia` só consulta `display-mode: standalone` e o gamut de cor (p3/srgb). Com reduce ativo, tudo rodou: partículas, vidro girando, neblina, decodificação, digitação.
- **Movimento automático contínuo:** além do que a rolagem conduz, várias coisas rodam sozinhas e sem parar (anel girando, partículas, neblina, a onda da navegação, o letreiro da música). Não há controle de pausa.
- **Zoom bloqueado:** o viewport usa `maximum-scale=1.0, user-scalable=no`, o que impede ampliar no celular (relevante para o SC 1.4.4).
- **Teclado:** Tab alcança os links da camada GLA11y e Enter os ativa. Mas o foco **não aparece**: o contorno existe (laranja, 1 px), só que fica atrás do canvas (SC 2.4.7 e 2.4.11).
- **Estrutura:** nenhum `h1`, `h2` ou `h3`; `lang="en"`; a mensagem principal não existe como texto.
- **Leitor de tela:** os links da GLA11y têm nome, então é possível navegar o portfólio e o contato. O conteúdo editorial (hero, manifesto, descrições na cena) só existe como pixels.
- **Legibilidade:** no mobile, o texto do hero passa por trás do anel de vidro e fica parcialmente ilegível (captura `21`). O contraste do texto sobre a cena não foi medido.
- **Som:** não ouvi áudio tocando sozinho, mas a faixa é baixada no carregamento. O desktop tem `noMusic=false`.
- **Rolagem horizontal:** nenhuma no mobile emulado (`scrollWidth` = 375).
- **Consentimento:** o GA dispara antes da escolha no banner de cookies.

## Limitações desta análise

- **Requisições nos workers:** as de assets 3D feitas dentro dos workers não apareceram na ferramenta de rede, então não sei quantos modelos e texturas existem, nem seus tamanhos.
- **Som:** não confirmei se a música começa sozinha nem em qual interação.
- **Chat:** não testei, porque enviar mensagem é submeter formulário. Não sei qual backend responde nem como o filtro reage a texto livre.
- **Cenas não vistas:** Lab e CleanRoom aparecem só como nomes de shader; não sei se estão ativas nem onde. O About foi visto depois (ver "About", abaixo).
- **Painel oculto:** com o painel do navegador oculto, os framebuffers WebGL ficaram com tamanho zero e a cena escura. Também o carregamento é lento nessa condição (~40 s). As capturas válidas foram feitas depois de corrigir isso.
- **Mobile:** o teste foi uma emulação na mesma GPU de desktop. Desempenho, aquecimento e bateria em celular real não foram avaliados. A emulação escolheu o nível mobile pela identificação do aparelho, não pelo hardware.
- **Desempenho:** não medi FPS, tempo de carregamento nem uso de memória de forma controlada.
- **Página /work isolada:** não testei abrir `/work` diretamente numa aba nova, só chegando pela rolagem.

## About (visto em 2026-11-07)

Tela enviada pelo cliente e leitura do código da cena:

- **Composição:** um anel de vidro de perfil refrata o título grande "CREATIVE DIGITAL EXPERIENCES"; o texto pequeno fica à direita. Tudo em NB Architekt, caixa alta, com espaço largo entre letras.
- **Logo:** fica no meio da altura da tela e gira no eixo vertical conforme a rolagem: `rotation.y = −200° · (p − 0,5) + 60°`, com `p` sendo o progresso da seção.
- **Texto:** não tem animação por letra. Aparece pelo corte da seção e sobe mais devagar que a página (cerca de 0,26× a velocidade da rolagem, estimado com um campo de visão de 45° presumido, porque não achei o valor real da câmera).
- **Uso no projeto:** D-017.

## O que levar para a Gniall

| No Active Theory | Tradução para a Gniall | Origem no conceito |
|---|---|---|
| Cena única com câmera contínua entre rotas | A câmera percorre **a matriz 45°**: cada seção é uma região da grade, e trocar de rota é se mover nela | Matriz |
| Filtro: os cards se desfazem em partículas e se refazem filtrados | Os módulos se desmontam em **nós** e se reencaixam na grade com o novo conjunto | Nó + matriz |
| Partículas descendo dos cards até a máquina | Nós fluindo pela grade até um ponto de **entrega** (commit, repositório do cliente) | Nó |
| Chat como navegação e texto digitado | Navegação como **terminal/prompt**: comandos, saídas, `<` `>` como delimitadores | Tag, código |
| Texto que decodifica no contato | Títulos que se resolvem como código, uma vez, na entrada | Código |
| Loader ASCII com contador | Loader em que a **matriz** se preenche e os nós acendem | Matriz, nó |
| Vidro que refrata o texto | Refração **dentro dos colchetes da tag**: o território que delimita e transforma | Tag |
| Camada GLA11y de links reais | Todo conteúdo em HTML semântico **por cima** ou em paralelo, com foco visível; o WebGL espelha o HTML, nunca o contrário | Requisito WCAG |
| Níveis de qualidade por GPU | Mesma estratégia: perfis de qualidade com fallback estático elegante | Engenharia |
| Só um vídeo de projeto carregado por vez | Carregar mídia sob demanda, um case em foco por vez | Engenharia |
| SEO por rota no servidor | Cada rota com HTML e metadados completos no servidor, **com conteúdo no `body`** | Engenharia |
| Cor de UI por projeto no CMS | **Não levar como cor.** Diferenciar cases por posição na grade e por forma, nunca por cor nova | Paleta oficial |

## O que não levar (conflita com o `CLAUDE.md`)

- **Logo dentro do efeito.** O símbolo da AT fica dentro do anel de vidro e é refratado. Na Gniall, o logo nunca recebe efeito; o que pode virar objeto é o **símbolo de tag como grafismo**.
- **Franjas cromáticas, iridescência, roxo do chat e cor por projeto.** Introduzem cores fora da paleta. Na Gniall, a luz é azul e ciano (o ciano só como acento).
- **Texto principal só no WebGL** e links escondidos atrás do canvas com foco invisível. Na Gniall, o HTML fica visível e focável, e o WebGL é camada visual.
- **Zoom bloqueado** (`user-scalable=no`).
- **Rolagem virtual** que substitui a nativa.
- **Movimento contínuo sem pausa** (até a D-004 ser decidida, nada automático com mais de 5 s).
- **GA antes do consentimento.**
- **Música baixada e oferecida por padrão.** Na Gniall, som só se for decidido, e desligado até a pessoa ligar.
- **Objetos sem relação com o conceito** (floresta, coluna vertebral, reator). Cada objeto precisa responder "matriz, tag ou nó?".
- **Chat com IA respondendo sobre a empresa** sem conteúdo real por trás. Se houver chat, ele não pode inventar clientes, cases ou números.

## Pontos para as decisões em aberto

- **D-004 (movimento):** o AT confirma o padrão do igloo.inc. O que a rolagem conduz (câmera, transições) atende ao SC 2.2.2; o que roda sozinho e sem parar (anel, partículas, neblina, letreiro) não atende.
- **D-005 (stack):** o AT roda sobre **motor proprietário** (Hydra), com workers, camada de acessibilidade, SEO por rota, níveis de GPU e XR, feitos ao longo de anos. Isso não se reproduz 1:1. O equivalente com ferramentas abertas seria three.js (ou R3F), com pós-processamento, partículas GPGPU, Draco/KTX2, texto MSDF e um sistema de níveis de qualidade. O Theatre.js aparece aqui; GSAP e Lenis, não.
- **D-006 (IBM Plex Mono):** o AT usa uma fonte técnica em todo o site, como o igloo.inc. As duas referências pedem uma voz "de código". A questão continua: Plex Sans pura ou exceção para a Mono.
- **Nova questão: chat como navegação.** O padrão é forte e combina com "terminal" e código, mas exige decidir se haverá IA (custo, moderação, risco de inventar informação) ou um prompt com comandos fixos.
