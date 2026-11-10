# Registro de decisões

Cada decisão recebe um número sequencial e não é apagada. Se mudar, a nova entrada substitui a antiga e a antiga recebe o status `substituída por D-XXX`.

```
## D-NNN: título curto
- **Data:** AAAA-MM-DD
- **Status:** vigente | pendente | substituída por D-XXX
- **Decisão:** o que foi decidido.
- **Motivo:** por quê.
- **Impacto:** o que muda no projeto.
```

---

## D-001: Fonte da identidade visual
- **Data:** 2026-11-05
- **Status:** vigente
- **Decisão:** a identidade segue o manual oficial (https://piv.agenciaquadri.com/gniall/). A cópia de trabalho fica em `docs/IDENTIDADE-VISUAL-GNIALL.md`, copiada sem alterações de `carby lading page/docs/referencias/`.
- **Motivo:** identidade 100% Gniall, sem cores, fontes ou ícones fora do sistema.
- **Impacto:** `#0C1E36` dominante, `#00D2D3` só como acento, IBM Plex Sans, Material Symbols Outlined, logo só com arquivos oficiais.

## D-002: Direção criativa experimental
- **Data:** 2026-11-05
- **Status:** vigente
- **Decisão:** site experimental/"absurdo" (referência inicial: igloo.inc), com todo efeito derivado do conceito da marca: matriz 45°, símbolo de tag e nós.
- **Motivo:** diferenciar o site sem sair da identidade.
- **Impacto:** as recomendações de "movimento discreto" do documento de identidade cedem a esta direção; as especificações oficiais não.

## D-003: Movimento com `prefers-reduced-motion`
- **Data:** 2026-11-05
- **Status:** vigente
- **Decisão:** animações e vídeos rodam também com movimento reduzido ativado, sem botões de pausa.
- **Motivo:** definição do briefing.
- **Impacto:** substitui as recomendações de movimento das §9, §10 e §11 do documento de identidade. Ver D-004.

## D-004: Compatibilizar D-003 com o SC 2.2.2 da WCAG
- **Data:** 2026-11-05
- **Status:** pendente para o resto do site; resolvida só na descida pela D-020 (alternativa abaixo)
- **Questão:** o SC 2.2.2 (nível A, portanto exigido pelo AA) pede um mecanismo de pausa para todo movimento que começa sozinho, dura mais de 5 s e aparece junto com outro conteúdo. D-003 elimina os botões de pausa.
- **Caminho que atende às duas regras:** movimento automático com no máximo 5 s, que termina parado; tudo que dura mais é guiado pela interação (rolagem, cursor, toque) e só se move enquanto a pessoa age. Vídeos seguem a mesma regra: até 5 s e param, ou avançam com a rolagem.
- **Alternativa:** manter loops e vídeos contínuos sem pausa e registrar essas peças como exceção declarada ao AA.

## D-005: Stack
- **Data:** 2026-11-05
- **Status:** vigente (o cliente autorizou o início da implementação em 2026-11-05)
- **Evidências:** o igloo.inc usa three.js r165 + GSAP 3.12.5 + Vite, com Draco e KTX2. O Active Theory usa motor proprietário (Hydra) + Theatre.js, com Draco e KTX2, e não usa three.js, GSAP nem Lenis. Detalhes em `docs/referencias/`.
- **Decisão:**
  - Next.js (App Router, exportação estática) + React + TypeScript, com pnpm.
  - three.js via React Three Fiber + Drei, com shaders GLSL próprios e pós-processamento (`@react-three/postprocessing`).
  - GSAP para as linhas do tempo (ScrollTrigger quando houver rolagem).
  - CSS próprio com os tokens oficiais (sem Tailwind por enquanto).
  - Modelos 3D, quando houver: glTF + Draco + KTX2. Blender (via MCP) só para modelagem, bake e caminhos de câmera.
  - Ficam fora do início: Framer Motion e Theatre.js. Lenis será testado no protótipo.
- **Motivo:** o HTML continua sendo a base (acessibilidade, SEO e uma URL por case), com uma camada WebGL única por cima. As duas referências usam o mesmo pipeline de assets (Draco + KTX2), e o three.js tem o maior ecossistema para chegar no nível delas.
- **Impacto:** o projeto passa a ter `package.json` na raiz. A implementação segue por partes: (1) tela de entrada, (2) sobre a Gniall, (3) portfólio.

## D-006: IBM Plex Mono para o vocabulário de código/HUD
- **Data:** 2026-11-05
- **Status:** pendente (decidir depois da análise das referências)
- **Questão:** o igloo.inc usa IBM Plex Mono em todo o site. A Mono pertence à família IBM Plex, mas o manual da Gniall especifica IBM Plex Sans. Usá-la em rótulos, coordenadas e trechos de código seria um desvio do manual.

## D-007: Navegação como prompt/chat
- **Data:** 2026-11-05
- **Status:** pendente
- **Questão:** o Active Theory filtra o portfólio por um painel de chat e mostra o detalhe do projeto como mensagens digitadas. Na Gniall, isso poderia virar um prompt de terminal. Falta decidir se haverá IA respondendo (custo, moderação, risco de inventar clientes ou números), um prompt com comandos fixos, ou nenhum dos dois.

## D-008: O site é um portfólio no nível do Active Theory
- **Data:** 2026-11-05
- **Status:** vigente
- **Decisão:** o site é um portfólio, com acabamento e ambição técnica no nível do Active Theory (cena 3D contínua, transições, qualidade ajustada ao aparelho). A direção visual é da Gniall: nada de cópia do design de referência.
- **Motivo:** definição do cliente.
- **Impacto:** os cases são o centro da experiência. Isso exige conteúdo e mídia reais de cada case (ver as perguntas da ETAPA 2). O nível técnico pede motor WebGL, shaders próprios, pipeline de assets 3D e níveis de qualidade por GPU (ver D-005).
- **Estrutura base (definida pelo cliente):** (1) tela de entrada com o logo da Gniall e animação; (2) tela sobre a Gniall; (3) portfólio de projetos. Equivalem à home, ao hero e ao `/work` do Active Theory. Ver D-009 sobre o logo.

## D-009: Animação na tela de entrada x regras do logo
- **Data:** 2026-11-05
- **Status:** vigente (escopo abaixo; o cliente pode ajustá-lo ao avaliar a v1), exceto o final idêntico ao arquivo na tela de entrada (substituído por D-013)
- **Decisão:** na tela de entrada, a animação usa a geometria do arquivo oficial do símbolo. As 4 peças (os dois colchetes e os dois nós) podem se mover separadas, ganhar profundidade, luz e brilho durante a montagem. A animação sempre termina no logo oficial parado, idêntico ao arquivo e nas cores oficiais. Fora da tela de entrada, valem todas as proibições do manual.
- **Motivo:** o cliente é o dono da marca e autorizou: "ignore um pouco dessa questão de proibição da marca, até pq a marca é minha".
- **Questão:** o cliente quer a tela de entrada "com o logo da Gniall e uma animação", no nível do Active Theory, onde o logo da AT é um objeto 3D de vidro com brilho. O manual oficial proíbe rotacionar o logo, aplicar brilho, relevo ou efeitos 3D e desconstruir ou reorganizar o símbolo. O `CLAUDE.md` também proíbe animá-lo.
- **Alternativas:**
  - **A.** O logo oficial fica estático (arquivo oficial em HTML) e a animação acontece em volta dele: a matriz 45° se monta, os nós acendem.
  - **B.** O protagonista 3D é um objeto derivado do conceito (colchetes de código a 45° delimitando um nó), claramente diferente do símbolo, e o logo oficial fica estático na composição.
  - **C.** Pedir aos responsáveis pela marca (manual da Agência Quadri) uma versão animada oficial do logo ou uma exceção por escrito ao manual.
- **Atualização (2026-11-05):** o cliente é o dono da marca e indicou que as proibições podem ser flexibilizadas na tela de entrada. Isso torna o caminho C viável por decisão do próprio dono. O escopo exato da exceção (o que pode ser animado e como) ainda precisa ser confirmado antes de alterar o `CLAUDE.md`.
- **Impacto:** o `CLAUDE.md` passa a registrar a exceção. Os arquivos oficiais foram baixados do banco de ativos do manual para `public/brand/oficial/`, sem alterações. A montagem da tela de entrada dura no máximo 5 s e termina parada (regra provisória enquanto a D-004 estiver pendente).

## D-010: Skills de apoio para WebGL e GSAP
- **Data:** 2026-11-05
- **Status:** vigente
- **Decisão:** instalar em `.claude/skills/` (escopo do projeto) skills de terceiros só em Markdown, copiadas sem alteração e fixadas em commit: EnzeD/r3f-skills (fundamentos, animação, shaders, pós-processamento), greensock/gsap-skills (core, timeline, performance, React, ScrollTrigger) e CloudAI-X/threejs-skills (shaders, pós-processamento). Origem, commits e licenças em `.claude/skills/README.md`.
- **Motivo:** pedido do cliente. São as que mais se aproximam da stack da D-005 (Fiber 9, React 19, three r185+), sem scripts. Ficaram de fora a juliobsz/awwwards, que decide sem consultar, desliga o WebGL com movimento reduzido e usa fotos de banco de imagens, e as que miram Fiber 8 ou estão sem manutenção.
- **Impacto:** as skills cedem ao `CLAUDE.md` e a estas decisões (item 4 da precedência). Os conflitos conhecidos, como a orientação de cortar animação com movimento reduzido no `gsap-core`, estão listados no README das skills.

## D-011: Entrada v2, enxame de nós + commit em metal
- **Data:** 2026-11-05
- **Status:** vigente, exceto o chão com a grade 45° (substituído por D-012)
- **Decisão:**
  - **Enxame (A):** os nós acendem sobre as linhas da matriz 45°, levantam do chão e voam até preencher o volume das 4 peças do símbolo oficial. Os alvos são amostrados dentro do contorno oficial, numa subgrade da própria matriz.
  - **Commit em metal (C):** uma varredura na diagonal de 45° troca os nós pelas peças sólidas em metal chanfrado. O chanfro fica para dentro, e a silhueta continua sendo o contorno oficial. O reflexo vem de um ambiente gerado no próprio código, sem baixar HDRI.
  - **Chão:** a matriz 45° vira um chão em perspectiva com o reflexo das peças. A câmera começa baixa e um pouco girada (18°) em relação à pose final, e sobe até ficar de frente. De frente, a matriz é idêntica à da v1: mesma grade, zona calma e contraste.
  - **HUD:** linhas de medição sobre a grade e as coordenadas das pontas dos colchetes em índices da matriz, calculadas do estado real da animação. Nenhum número inventado.
  - **Onda de choque:** quando os nós fazem o commit, as ondas em losango percorrem o chão, com um único pulso de brilho.
  - **Tempo:** até 5 s de movimento automático. A cena termina parada, no logo oficial em HTML, idêntico ao arquivo.
- **Motivo:** pedido do cliente, uma entrada "mais triunfal, com mais WebGL". Os padrões vêm das referências em `docs/referencias/entradas-awwwards.md`, e o visual de referência é o lookdev `docs/estudos/entrada-lookdev-01.png` (Blender).
- **Impacto:**
  - Reescreve `components/entry/` (cena, sombreador da matriz e módulos novos de peças, enxame e ambiente).
  - Cada efeito sai do conceito da marca: enxame e commit vêm dos nós; chão, HUD e varredura vêm da matriz 45°; as peças são o símbolo de tag.
  - Mantém D-003, D-004 (≤ 5 s) e D-009.
  - O HUD usa IBM Plex Sans com algarismos tabulares, porque a D-006 (Mono) segue pendente.
  - Conferido na implementação:
    - O movimento automático dura 4,8 s.
    - No pior segundo há 3 clarões: a trava dos colchetes e a queda dos dois nós. O limite do SC 2.3.1 é não passar de 3.
    - Os rótulos do HUD (#B7C5D4) têm contraste ≥ 5,97:1, mesmo sobre uma linha da grade; as linhas do HUD, ≥ 5,9:1.
    - No fim, as peças achatadas coincidem com o logo HTML (comparado com o logo oculto e com o canvas oculto).

## D-012: Entrada v3, partículas no lugar da grade e logo que se desfaz no cursor
- **Data:** 2026-11-05
- **Status:** vigente, exceto o furo no cursor e a troca final pelo logo HTML (substituídos por D-013; o logo HTML continua como reserva sem WebGL) e o campo de nós do fundo (substituído por D-014)
- **Decisão:**
  - **Fundo:** sai o chão com a grade 45°. No lugar, um campo de nós (pequenos quadrados) solto no espaço, que acende na revelação em losango. Fica parado depois da intro e só reage ao cursor e às ondas do commit.
  - **Montagem:** o enxame sai do próprio campo de nós e vira o metal do símbolo, como na D-011. Em seguida, o nome GNIALL e a assinatura SOFTWARE & IA se formam com nós amostrados do arquivo oficial (`lg-vt-color-inverted.svg`), nas cores exatas do arquivo. No fim, a cena troca para o logo oficial parado, em HTML.
  - **Cursor:** depois da intro, perto do cursor o logo se desfaz em nós (um furo no logo oficial, com raio de 48 a 84 px). Quando o cursor sai, os nós voltam e o logo fica inteiro, idêntico ao arquivo.
  - **Tempo:** o movimento automático continua com no máximo 5 s (D-004). A reação ao cursor só acontece quando a pessoa mexe o mouse ou o dedo.
- **Motivo:** pedido do cliente: "Acho que esse fundo quadriculado está estranho, podiam ser particulas que se juntam e viram o genial, e quando passo o mouse ele meio que se defaz em particulas". Respostas do cliente: logo inteiro em partículas, manter o metal no símbolo e desfazer só perto do cursor.
- **Impacto:**
  - Amplia a exceção da D-009 ao logo inteiro (símbolo, nome e assinatura), só na tela de entrada. O `CLAUDE.md` registra a mudança.
  - Origem no conceito da marca: as partículas são os nós; a revelação e as ondas são losangos da matriz 45°; o nó disperso gira para 45° (tag).
  - O texto não fica por cima de nós: o campo some atrás do nome, da assinatura e do texto, e os nós do logo que se soltam somem antes de entrar na área do texto.
  - Conferido na implementação (navegador do app, 1104 × 854 e 375 × 812):
    - Os nós do nome e da assinatura pousam até 3,68 s, antes de a câmera parar (3,9 s). O logo HTML assume entre 4,35 s e 4,8 s.
    - Com o mouse sobre o nome ou sobre o símbolo, o logo abre o furo e os nós daquele trecho se soltam. Com o mouse fora, a máscara sai (`mask-image: none`) e o logo fica idêntico ao arquivo.
    - Texto sobre o fundo: #F4F8FC tem 15,7:1 e #B7C5D4 tem 9,5:1 sobre #0C1E36. Nenhum nó aparece atrás do texto.
    - Sem rolagem horizontal em 375 px.
    - Ainda não conferido: o furo com o dedo (toque) e a contagem de clarões por segundo (SC 2.3.1) nesta versão.

## D-013: Entrada v4, logo em metal 3D com luz e inclinação no cursor
- **Data:** 2026-11-05
- **Status:** vigente, exceto o ambiente (bokeh e campo de nós recuando), substituído por D-014
- **Decisão:**
  - **Logo em metal:** na tela de entrada, o logo inteiro fica em repouso como objeto de metal 3D. O símbolo são as 4 peças em metal (D-011). O nome e a assinatura são extrudados dos paths do arquivo oficial (`lg-vt-color-inverted.svg`), lido sem alterações. A face da frente fica sobre o contorno do arquivo, com o chanfro para dentro: vista de frente, a silhueta e a posição são as do arquivo.
  - **Cores:** cada path mantém a cor que tem no arquivo. O que é Ciano Cibernético vira metal ciano: o símbolo, "SOFTWARE &" e o pingo do i. O que é branco vira metal prata: "GNIALL" e "IA". Nenhuma cor nova.
  - **Cursor:** sai o furo da D-012. O logo inclina até 0,13 rad (cerca de 7°) na direção do cursor, a câmera faz uma leve paralaxe e o reflexo corre pelo metal. Com o cursor fora, o logo volta a ficar de frente.
  - **Ambiente:** nós fora de foco em losango (bokeh) na frente e atrás do logo, um foco de luz no logo e o campo de nós recuando para trás dele. O reflexo vem de um ambiente gerado no código, com riscos de luz a 45°. Nenhum HDRI baixado.
  - **Montagem:** igual à D-012 até os nós pousarem no nome e na assinatura. No fim, uma varredura na diagonal troca os nós das letras pelo metal (3,45 s a 4,2 s), em vez de trocar pelo logo HTML.
  - **Tempo:** o movimento automático termina em 4,8 s (D-004). Depois disso, a cena só desenha quando o mouse ou o dedo se mexe.
  - **Sem WebGL:** se o WebGL falhar, o contexto for perdido ou o arquivo não carregar, entra o logo oficial em HTML, como na v3.
- **Motivo:** pedido do cliente: "Esse circulo não está muito bom. Está estranho. EU quero que esse logo da gniall fique metalizado, quase que um 3d. As particulas do background, tem que ser um ambiente mais tecnologico, um 3d mais cheio, presente, quase que uma ambientação com foco e iluminação no logo da gniall. Se inspire no site refencia da activetheory.net". Respostas do cliente: luz e inclinação no cursor, metal ciano + prata, movimento só com o cursor.
- **Impacto:**
  - Amplia a exceção da D-009 e da D-012, só na tela de entrada: o logo termina em metal 3D, não mais idêntico ao arquivo em cor e acabamento. A silhueta continua sendo a do arquivo. Fora da tela de entrada, valem todas as proibições do manual. O `CLAUDE.md` registra a mudança.
  - Origem no conceito da marca: os bokeh são nós girados a 45° (tag); os riscos de luz e a varredura correm na diagonal da matriz 45°.
  - `components/entry/latticeShader.ts` ficou sem uso desde a D-012.
  - Conferido na implementação (navegador do app, 1280 × 720 e 375 × 812):
    - A inclinação e o reflexo acompanham o cursor.
    - Texto com o cursor por cima, contra os pixels mais claros atrás dele: #F4F8FC tem ≥ 11,77:1 e #B7C5D4 tem ≥ 7,90:1.
    - SC 2.3.1 (clarões), medido pixel a pixel em 36 quadros de 2,40 s a 4,30 s, numa região de 532 × 532 px em volta do logo. Os quadros têm passo de 0,025 s perto da trava dos colchetes e de 0,05 a 0,1 s no resto. Na pior janela de 341 × 256 px (25% de um campo de 10°, na referência de 1024 × 768), 7.621 px passam de 3 clarões no mesmo segundo. O limite de área é 21.824 px, então a cena passa.
    - Ressalvas da medição: a contagem por pixel trata movimento (peças, nós e reflexo passando) como clarão, então superestima. Picos mais curtos que o passo entre quadros podem ter escapado. O trecho antes de 2,40 s não foi medido de novo nesta versão.
    - Sem rolagem horizontal em 375 px, com o logo em metal inteiro na tela.
    - Ainda não conferido: a inclinação com o dedo num aparelho de toque real.

## D-014: Entrada v5, cenário de data center
- **Data:** 2026-11-06
- **Status:** vigente, exceto o corredor de racks (racks, colunas e teto), substituído pela D-036
- **Decisão:**
  - **Cenário:** sai o ambiente abstrato da D-012 e da D-013 (campo de nós e bokeh soltos no espaço). No lugar, um corredor escuro de data center: duas fileiras de racks de 42U, faixas de luz no teto, névoa azul e um foco de luz no logo. Tudo gerado no código (`components/entry/datacenter.ts`), sem imagem nem HDRI baixado.
  - **Racks:** a frente segue a matriz. Blocos de 4U com unidades de 1U, 2U e 4U (servidor, storage e switch), furos quadrados nos trilhos e perfuração em losango (45°) nos servidores.
  - **LEDs:** são os nós da marca. Quadrados pequenos, brancos ou em #B7C5D4, e poucos em Ciano Cibernético. Nenhuma cor funcional. O foco é o logo: os LEDs perto da câmera ficam fora de foco, como losangos.
  - **Chão:** polido, sem grade, com o reflexo do logo em metal e dos LEDs.
  - **Montagem:**
    - Os racks ligam numa frente em losango que parte da base do logo (0 a 1,15 s), enquanto a câmera avança pelo corredor até a pose final (3,9 s).
    - Os LEDs saem dos racks e viram o enxame do símbolo (D-011) e os nós do nome e da assinatura (D-012). O LED do rack apaga quando o nó sai.
    - Quando os dois nós do símbolo encaixam, saem duas ondas em losango no chão.
    - Depois do commit, os LEDs que saíram acendem de novo, numa única passada (3,3 s a 4,3 s).
  - **Tempo:** o movimento automático termina em 4,8 s, como na D-013 (D-004). Depois, a cena fica parada e só desenha de novo quando o mouse ou o dedo se mexe. Os LEDs não piscam.
  - **Logo:** igual à D-013 (metal ciano + prata, inclinação e luz no cursor; sem WebGL, o arquivo oficial em HTML).
- **Motivo:** pedido do cliente: "precisamos melhorar o fundo do cenário. esta bem ruim. Muito abstrato. Melhore isso". Resposta do cliente: "Data center (Recomendado)", com corredor de racks, LEDs que são os nós, chão polido refletindo o logo, névoa azul, LEDs do primeiro plano fora de foco, LEDs que saem dos racks e montam o logo, tudo em código.
- **Impacto:**
  - Substitui o fundo da D-012 (campo de nós) e o ambiente da D-013 (bokeh e campo recuando). O enxame e os nós do logo agora partem dos LEDs, não do campo.
  - O reflexo do logo no chão é a cena refletindo o objeto em metal da D-013, só na tela de entrada. Nenhuma regra nova no `CLAUDE.md`.
  - Origem no conceito da marca: os LEDs são os nós; a perfuração dos servidores, a frente de energia e as ondas no chão são losangos da matriz 45°. Os racks, o teto e a névoa são o cenário escolhido pelo cliente, não efeitos. O que se move ou acende neles vem dos três elementos.
  - Cores: racks em #B7C5D4 escurecido (×0,16) sobre o #0C1E36; LEDs em branco ou #B7C5D4; o acento só em poucos LEDs. Nenhuma cor nova.
  - Arquivos: entra `datacenter.ts`. Saem `cloud.ts` e `bokeh.ts`, que ficaram sem uso. `swarm.ts`, `logoParticles.ts` e `EntryCanvas.tsx` foram reescritos para partir dos LEDs.
  - Conferido na implementação (navegador do app, 1280 × 720 e 375 × 812):
    - Quadros de 0,3 s a 6 s em 1280 × 720 e de 1,2 s e 6 s em 375 × 812: corredor, câmera, enxame saindo dos LEDs, nome e assinatura, ondas, reflexo e estado final. Nenhum erro de shader no console.
    - São 21.511 LEDs. Deles, 3.744 voam para o símbolo e 3.000 para o nome e a assinatura. O enxame pousa até 1,91 s e o nome até 3,67 s.
    - Texto sobre o fundo, contra o pixel mais claro atrás de cada linha, no estado final (t = 4,0 s e 6 s). Em 1280 × 720, #F4F8FC tem 9,77:1 e #B7C5D4 tem 6,92:1. Em 375 × 812, 8,78:1 e 5,00:1.
    - Com o cursor em 8 posições (sobre o texto, sobre o logo, nos cantos e nas laterais do texto), o pior caso foi 9,19:1 e 6,48:1 em 1280 × 720, e 8,56:1 e 4,95:1 em 375 × 812. Passa, mas a margem do #B7C5D4 no celular é pequena.
    - Sem rolagem horizontal em 375 px.
    - Desempenho nesta máquina, em 1280 × 720: 143,8 quadros por segundo em média, p95 de 7,1 ms, pior quadro de 13,8 ms.
    - `pnpm typecheck` e `pnpm build` passam.
  - SC 2.3.1 (clarões): analisado, não medido pixel a pixel nesta versão. A frente de energia, cada onda e o reacender passam uma vez por pixel. No pico da câmera, as faixas do teto passam por cada pixel cerca de 1,6 vez por segundo, em faixas finas e de área pequena. A estimativa é de no máximo 2 clarões por segundo.
  - Ainda não conferido: a medição pixel a pixel do SC 2.3.1, a inclinação com o dedo num aparelho de toque real e o desempenho em placas de vídeo mais fracas.

## D-015: Transição de rolagem da entrada para o Sobre
- **Data:** 2026-11-06
- **Status:** vigente, exceto a roda sem deslize no item "Rolagem" (substituído por D-016) e, nos itens "Só o símbolo desce", "Símbolo no Sobre" e "Texto do Sobre", o eixo do giro, o lugar do símbolo, a ordem no celular e o momento em que o texto aparece (substituídos por D-017); o que o corte revela, o caminho do símbolo e o título (substituídos por D-019); no item "Texto do Sobre", os 5 pilares e a pendência de fundação, sede e equipe (substituídos por D-025); o repouso "de frente" do símbolo no Sobre (substituído por D-039)
- **Decisão:**
  - **Rolagem:** a transição acompanha a rolagem nativa da página, sem sequestro (nada de rolagem simulada ou travada). Teclado, roda, toque e barra de rolagem funcionam como em qualquer página. Voltar a rolagem desfaz tudo. Nada se move sozinho: sem rolagem, a cena fica parada.
  - **Corte em diagonal 45°:** uma linha "/" (de baixo à esquerda para cima à direita) entra pelo canto de baixo à direita e varre a tela até o canto de cima à esquerda. Acima e à esquerda dela fica o data center; abaixo e à direita, o Sobre. A borda se desfaz em nós (quadrados pequenos, como os LEDs).
  - **Só o símbolo desce:** as 4 peças do símbolo em metal se soltam do logo, giram mostrando a espessura do metal e descem até o lado do título do Sobre. O nome e a assinatura ficam no data center e saem com ele.
  - **Símbolo no Sobre:** termina de frente, no mesmo metal ciano da D-013, e continua inclinando na direção do cursor. No celular, ele para acima do texto. Sem WebGL, entra o arquivo oficial `sy-color-inverted.svg` parado no mesmo lugar.
  - **Fundo do Sobre:** Azul Noturno Soberano liso, com uma luz suave atrás do símbolo. Sem grade.
  - **Texto do Sobre:** só aparece depois que o símbolo passa e nunca fica atrás nem embaixo dele. Vem do manual (§1): essência, zero lock-in e os 5 pilares. Fundação, sede e equipe ficam como pendência explícita até o cliente enviar os dados.
  - **Título (rascunho, aguardando aprovação do cliente):** "Software que vira patrimônio do cliente."
  - **Depois do Sobre:** se o símbolo segue até o portfólio fica para a parte 3.
- **Motivo:** pedido do cliente, com 3 telas do Active Theory como referência: "Quando scrollar, o logo gira e começa a descer, com a tela repartida assim, até chegar na seção tipo de sobre nos". Respostas do cliente: "Diagonal 45° (Recomendado)", "Só o símbolo (Recomendado)", "Metal ciano (Recomendado)" e "Textos do manual (Recomendado)". Depois: "Pode implementar".
- **Impacto:**
  - Amplia a exceção da D-013: as peças do símbolo em metal podem girar e descer com a rolagem e ficar em repouso no Sobre. O nome e a assinatura continuam só na tela de entrada. O `CLAUDE.md` registra a mudança.
  - Origem no conceito da marca: o corte é a diagonal da matriz 45°; a borda são nós; o símbolo que desce é o próprio tag, girando no eixo da diagonal.
  - Movimento: só com a rolagem, então não conta como movimento automático (D-004 continua pendente e não é afetada).
  - Conferido na implementação (navegador do app, 1280 × 720, 1104 × 854 e 375 × 812):
    - Texto do Sobre contra o pixel mais claro atrás de cada linha, em 1280 × 720: pior caso de 8,57:1 com a rolagem em 1080 px e de 8,65:1 em 1500 px.
    - Texto da entrada durante o corte, em 1104 × 854, só na parte que ainda aparece (a que o corte não escondeu), com a rolagem de 250 a 600 px: pior caso de 9,44:1 na frase principal e de 6,65:1 na linha do zero lock-in.
    - No celular, o símbolo para acima do texto do Sobre.
    - Sem rolagem horizontal em 375 px.
  - Ainda não conferido: a medição pixel a pixel do SC 2.3.1 durante o corte e a inclinação com o dedo num aparelho de toque real.

## D-016: Roda com deslize, no modelo do Active Theory
- **Data:** 2026-11-06
- **Status:** vigente
- **Decisão:**
  - **Roda com deslize:** a roda do mouse e o touchpad não pulam mais direto para a posição nova. A página desliza até ela, andando 10% do que falta a cada quadro (a 60 quadros/s, corrigido para telas de 120 e 144 Hz). É a mesma constante do Active Theory (`LERP = 0.1`). Pela conta, um clique da roda (100 px) assenta em cerca de 0,8 s.
  - **O resto fica nativo:** teclado, toque (com a inércia do próprio aparelho), barra de rolagem, Ctrl + roda (zoom), rolagem horizontal e áreas com rolagem própria. Se um deles mexer durante o deslize, o deslize para e vale a posição nova.
  - **A rolagem continua sendo a da página** (`window.scrollY`): sticky, busca, foco por teclado e links funcionam como antes. Diferença do Active Theory: lá a página rola sem deslize e só o desenho persegue a rolagem. Aqui o texto do Sobre é HTML, então é a própria rolagem que desliza, e o HTML e a cena andam juntos.
  - **Um relógio só:** durante o deslize, cada quadro da cena dá o passo da rolagem, atualiza o HTML que depende dela (o recorte do texto e a entrada do Sobre) e desenha. Nenhum dos dois fica um quadro atrás do outro.
  - **Sem biblioteca:** código próprio em `components/entry/smoothScroll.ts`, sem instalar pacote.
- **Motivo:**
  - Pedido do cliente: "a animação de scroll ta estranho, ta frame a frame, não ta sutil e boa igual a do site referencia. Acesse ele e veja como é lá. Se baseie 100% naquele modelo, como uma animação fluida".
  - Causa encontrada: depois da intro, a cena só desenhava quando chegava um evento de rolagem, e cada clique da roda pulava cerca de 100 px de uma vez. A passagem andava em degraus.
  - No código do Active Theory (ver `docs/referencias/activetheory.md`): a posição persegue a rolagem com LERP 0,1 por quadro, corrigido pela taxa de quadros.
- **Impacto:**
  - Substitui, só para a roda, o "sem sequestro (nada de rolagem simulada ou travada)" da D-015. A rolagem não trava nem muda de comprimento, e voltar continua desfazendo tudo.
  - Movimento: o deslize só completa o pedido da roda (menos de 1 s) e para. Não conta como movimento automático (D-004 não é afetada).
  - Origem no conceito da marca: não é um efeito novo. É o ritmo da rolagem que move os efeitos da D-015.
  - Arquivos: entra `smoothScroll.ts`. `EntryScreen.tsx`, `EntryCanvas.tsx` e `types.ts` passam a usar o mesmo relógio. Só o comentário de `transition.ts` mudou.
  - Conferido na implementação (navegador do app, 1104 × 854 e 375 × 812):
    - Quadro a quadro, a 144 Hz: um clique de 100 px anda 3, 7, 11 e 15 px nos primeiros quadros. São 4,3% por quadro, o equivalente a 10% a 60 Hz.
    - O deslize funciona para baixo e para cima. Page Down continua nativo.
    - Durante o deslize, o recorte do texto e o corte da cena ficam no mesmo lugar.
    - Console sem erros depois de recarregar a página.
  - Ainda não conferido:
    - A fluidez em tempo real. Nesta sessão, o painel do app entregou cerca de 1 quadro/s a qualquer cena WebGL, inclusive ao próprio site do Active Theory (na D-014, o mesmo painel deu 143,8 quadros/s). A sensação final precisa ser vista num navegador comum.
    - Touchpad real e mouse com roda em linhas (Firefox).

## D-017: Símbolo saindo do meio e texto do Sobre no modelo do Active Theory
- **Data:** 2026-11-07
- **Status:** vigente, exceto o caminho e o tempo do símbolo e a tipografia e a composição da primeira tela do Sobre (substituídos por D-019)
- **Decisão:**
  - **Símbolo:** as 4 peças em metal saem do meio do logo da entrada e descem em linha reta até o meio da primeira tela do Sobre. Giram uma volta no eixo vertical, como no Active Theory, e terminam de frente. Sem arco e sem crescer no meio do caminho. O símbolo chega com 84% da passagem, fica parado até o fim dela e depois rola com a página.
  - **Primeira tela do Sobre:** título grande à esquerda, símbolo no meio, texto pequeno à direita. No celular, a ordem é título, símbolo, texto.
  - **Texto do Sobre:** aparece pelo próprio corte diagonal, do lado do Sobre, depois da borda de nós (não letra por letra). Sobe a 40% da velocidade da rolagem e, nos últimos 20% da passagem, acelera até a velocidade da página, sem tranco quando a entrada solta. Enquanto o símbolo passa, o texto nunca fica por cima nem por baixo dele: um recorte em volta do símbolo esconde a parte do texto que o tocaria.
  - **Tipografia:** IBM Plex Sans Light em caixa alta, com mais espaço entre letras, composta como no Active Theory. Título com 0,04em de espaçamento; texto em 0,875rem, com 0,06em de espaçamento e entrelinha 2.
- **Motivo:**
  - Pedido do cliente, com uma tela do About do Active Theory: "analise o site referencia, e deixe o movimento mais parecido, o logo saindo do meio, descendo com o texto aparecendo do mesmo jeito e mesmas fontes, até chegar ao fim".
  - Respostas do cliente: "Plex Sans caixa alta (Recomendado)" e "Símbolo no meio (Recomendado)".
  - No código do Active Theory (ver `docs/referencias/activetheory.md`): no About, o logo fica no meio da altura da tela e gira no eixo vertical com a rolagem. O texto não tem animação por letra: aparece pelo corte da seção e sobe mais devagar que a página.
- **Impacto:**
  - Substitui, na D-015, o eixo do giro (era a diagonal "/"), o lugar do símbolo (era ao lado do título), a ordem no celular (o símbolo parava acima do texto) e o momento do texto (só depois que o símbolo passava). O resto da D-015 continua.
  - Origem no conceito da marca: o corte é a diagonal da matriz 45°, a borda são nós e o símbolo que desce é o próprio tag.
  - Movimento: só com a rolagem (D-004 não é afetada).
  - Arquivos: `transition.ts` passa a ter a conta do caminho do símbolo (`symbolAt`), usada pelo palco e pelo recorte do texto. Mudam também `EntryScreen.tsx`, `EntryCanvas.tsx`, `AboutSection.tsx` e `AboutSection.module.css`.
  - Conferido na implementação (navegador do app, 1104 × 854 e 375 × 812):
    - No computador, a primeira tela termina com o título à esquerda, o símbolo de frente no meio e o texto à direita. No meio da rolagem, o símbolo aparece de perfil no giro vertical.
    - O texto sobe a 0,4× da rolagem no começo e chega à velocidade da página no fim, sem salto.
    - No celular, o título só aparece quando o símbolo já está chegando (perto de 75% da rolagem). Nenhum texto fica por cima ou por baixo do símbolo.
    - Sem rolagem horizontal (375 px de largura em 375 px). O título cabe inteiro nos dois tamanhos.
    - Texto do Sobre contra o pixel mais claro atrás de cada linha, só na parte que o recorte mostra, de 5% a 100% da rolagem: pior caso de 8,32:1 em 1104 × 854 e de 8,02:1 em 375 × 812.
    - Nenhum erro no console.
    - Não conferido aqui: a fluidez real, quadro a quadro, numa tela de 60 Hz; e o SC 2.3.1 pixel a pixel (o giro só anda com a rolagem e não tem clarão novo).

## D-018: NB Architekt nos títulos grandes
- **Data:** 2026-11-07
- **Status:** aprovada pelo cliente; aguardando os arquivos da compra (até lá, os títulos seguem em IBM Plex Sans)
- **Decisão:**
  - Usar a NB Architekt (Neubau, a fonte do Active Theory) só nos títulos grandes, em caixa alta. O resto do site continua em IBM Plex Sans.
  - Pacote que serve, na loja oficial (https://neubauladen.com/product/nb-architekt-edition-mmxx/):
    - **Typeface:** "NB Architekt™ Std Edition [Basic Set: Bold, Regular, Light]".
    - **License:** "Webfonts License (max. 50k Pageviews/Month) 1 Domain, Self Hosting".
    - **Format:** "WEBFONTS (WOFF, WOFF2)".
    - Preço lido em 2026-11-07: €99,00 sem impostos.
  - Os arquivos vêm só da compra do cliente. Não se baixa a fonte de nenhum outro lugar.
- **Motivo:** perguntas do cliente: "Se eu comprar a fonte nb architekt podemos por?" e depois "pode verificar, e se der, use ela". Conferido na loja oficial: há licença web para hospedar no próprio servidor (por domínio e por visualizações por mês), e o português está na lista de idiomas das versões Std e Pro.
- **Impacto:**
  - Muda a regra oficial "IBM Plex Sans, família única" do manual. É decisão do dono da marca. O ideal é atualizar o manual também. O `CLAUDE.md` registra a exceção.
  - Código pronto para a troca: os títulos grandes usam `--font-family-display` (em `app/globals.css`), que hoje aponta para a Plex.
  - Para ativar, quando os arquivos chegarem:
    1. Conferir nos arquivos os acentos do português (á, à, â, ã, é, ê, í, ó, ô, õ, ú, ç e as maiúsculas).
    2. Guardar os WOFF2 em `app/fonts/nb-architekt/`, com a nota fiscal ou o EULA.
    3. Carregar com `next/font/local` em `app/layout.tsx` e apontar `--font-family-display` para ela.
    4. Conferir de novo: título cabendo na coluna, sem rolagem horizontal em 375 px e contraste.
  - Limites da licença: 1 domínio e até 50 mil visualizações por mês. Acima disso, troca-se de licença.
  - Se o código for para um repositório público, os arquivos da fonte ficam fora dele: o EULA da Neubau não permite deixá-los disponíveis para download.

## D-019: Descida com vídeo e luzes coloridas, e o novo texto do Sobre
- **Data:** 2026-11-07
- **Status:** vigente, menos o vídeo guiado pela rolagem e a parte de movimento do Impacto, substituídos pela D-020, os feixes finos a 45° e o "vídeo abaixo de 10% de luminância", substituídos pela D-021, e o comprimento da descida (cerca de 4,5 telas), substituído pela D-030 (o texto novo é rascunho, aguardando aprovação do cliente)
- **Decisão:**
  - **Descida:** entre a tela de entrada e o Sobre entra um trecho longo, conduzido só pela rolagem (cerca de 4,5 telas). O corte diagonal da D-015 agora abre a descida, não mais o Sobre. O símbolo em metal sai do logo, desce até o meio da tela e segue girando no eixo vertical, enquanto o cenário sobe em volta dele. No fim, um segundo corte diagonal "/" abre o Sobre e o símbolo pousa no lugar dele, de frente.
  - **Vídeo de fundo:** o vídeo enviado pelo cliente (tecnologia, 20 s) passa no fundo da descida, conduzido pela rolagem. Percorrer a descida percorre o vídeo inteiro, e voltar a rolagem volta o vídeo. Leva desfoque leve e fica bem escurecido, para não ser o destaque. Sem som. A versão convertida fica em `public/media/`; o original fica fora do projeto.
  - **Luzes (o destaque):** brilhos coloridos que giram em volta do símbolo, feixes finos na diagonal de 45° e nós (quadrados pequenos) que sobem enquanto a página desce. As cores trocam aos poucos com a rolagem e iluminam o metal do símbolo, no reflexo e na borda.
  - **Cores das luzes:** ciano #00D2D3, violeta #8B5CFF, verde-limão #B6FF3B, laranja #FF7A1A e rosa #FF3D8B. É uma exceção à paleta, decidida pelo dono da marca, e vale só para a luz da descida: nunca em texto, botão, ícone ou fundo do resto do site.
  - **Primeira tela do Sobre:** formatação do About do Active Theory. Título enorme à esquerda, em 3 linhas, com brilho. Símbolo no meio. Coluna estreita à direita, com texto pequeno em caixa alta. Sai a linha "◆ Sobre a Gniall" de cima do título.
  - **Texto novo (rascunho, aguardando aprovação do cliente):** uma brincadeira com o nome da marca.
    - Título: "Isso que é ser Gniall."
    - Coluna: "Ser genial é ter a ideia." Depois, dois parágrafos com o conteúdo do manual (§1): a essência (engenharia de missão crítica e IA aplicada) e o zero lock-in.
  - **Fonte do título:** a do Active Theory é a NB Architekt (D-018). Até os arquivos da compra chegarem, o título segue em IBM Plex Sans.
- **Motivo:**
  - Pedido do cliente: "quando scrollar do inicio, antes de chegar na parte que tem o texto, tenha um pedaço que o logo vai descendo, quero varias animações acompanhando o movimento, igual no active theory, com esse video passando no fundo, com um leve blur. Ele não deve ser o destaque. Os efeitos luminosos, que ficam se mexendo e aparecendo na tela devem ser o destaque. Eles devem ir trocando de cor e iluminando o logo".
  - Sobre o texto: "O texto deve ter efeito luminoso, sem o bullet em cima. A formatação deve ser identica ao que é o active theory" e "coloque um texto meio legal sobre SER GENIAL, meio que uma brincadeirinha com o nome da marca, tipo ... isso que é ser GNIALL".
  - Cores: resposta do cliente "Cores livres, como o AT".
- **Impacto:**
  - Substitui, na D-015 e na D-017: o que o corte revela (agora a descida; o Sobre entra por um segundo corte no fim), o caminho e o tempo do símbolo, o comprimento da passagem, o título e a formatação da primeira tela do Sobre. O resto delas continua (corte a 45° com borda de nós, texto que aparece pelo corte e sobe mais devagar, texto nunca por cima nem por baixo do símbolo).
  - Amplia a D-013 e a D-015: o metal do símbolo pode receber luz colorida, só a luz da descida. A silhueta e o arquivo não mudam. Sem WebGL, não há descida (as seções ficam empilhadas) e entra o arquivo oficial do símbolo parado. O `CLAUDE.md` registra a exceção de cor.
  - Origem no conceito da marca: os feixes seguem a diagonal da matriz 45°; as partículas são nós; os dois cortes são a diagonal com borda de nós; o símbolo que desce é o tag. O vídeo é só fundo, não é efeito.
  - Movimento: tudo segue a rolagem e o cursor. O vídeo não toca sozinho, anda com a rolagem. Nada se move sozinho por mais de 5 s (D-004 não é afetada).
  - SC 2.3.1 (clarões), pela construção:
    - As cores das luzes são ajustadas para a mesma luminância, então a troca de cor não é clarão. Não há vermelho saturado.
    - O vídeo escurecido fica abaixo de 10% de luminância relativa, então os cortes do vídeo não chegam a ser clarão.
    - Cada pixel recebe no máximo 3 passagens de luz forte em toda a descida. Assim, nem uma rolagem muito rápida passa de 3 clarões por segundo. Feixes e nós são finos ou pequenos, abaixo da área que conta como clarão.
  - Pendência: confirmar a licença de uso do vídeo antes de publicar o site (o arquivo veio do cliente).

## D-020: Vídeo, nós e luzes da descida se movem sozinhos
- **Data:** 2026-11-07
- **Status:** vigente, exceto o ganho do vídeo (0,065) e a nuvem de nós GPGPU com ruído curl, substituídos pela D-021
- **Decisão:**
  - **Vídeo:** enquanto a descida está na tela, o vídeo roda em loop sozinho, sem som, mesmo sem rolagem. Fora dela, pausa. Segue com desfoque leve, curva de contraste e bem escuro (ganho 0,065), para não ser o destaque.
  - **Nós (partículas):** uma nuvem de cerca de 31 mil nós (quadrados pequenos) simulada na GPU (GPGPU com ruído curl), no modelo do Active Theory. Os nós fluem sozinhos em aglomerados irregulares, passam na frente e atrás do símbolo, ganham foco ou desfoque pela profundidade, nascem de novo quando acabam e só brilham onde as luzes batem (no resto, são pontos escuros). A rolagem acelera o fluxo.
  - **Luzes:** além de seguir a rolagem, giram, mudam de forma e trocam de cor devagar sozinhas: uma volta a cada ~70 s, uma cor da paleta a cada ~30 s, respiração de ~11 s.
  - Os feixes a 45° continuam guiados só pela rolagem.
  - Sem modelo 3D externo: as partículas do Active Theory são simulação em tempo real, não um modelo (o Blender não foi necessário).
- **Motivo:** pedido do cliente (dono da marca): "O video deve ficar passando, mesmo se eu nao scrollar. As particulas não estáo iguais a do activetheory." Antes: "tem que ter diversar particulas que se mexem, igual é no active, de forma que o logo fique até atras, e as luzes iorregulares vão iluminando".
- **Impacto:**
  - Resolve a D-004 só na descida, pela alternativa dela: movimento contínuo sem botão de pausa, registrado como **exceção declarada ao SC 2.2.2** (nível A). O resto do site segue a regra dos 5 s até a D-004 ser decidida. O `CLAUDE.md` registra a exceção.
  - No meio da descida não há texto. Texto só aparece nos dois cortes (a entrada saindo e o Sobre chegando), que seguem a rolagem; com o Sobre no lugar, o movimento sozinho para.
  - Substitui, na D-019, o vídeo guiado pela rolagem e o item de movimento do Impacto. O resto da D-019 continua.
  - Origem no conceito da marca: as partículas são nós; o vídeo é só fundo.
  - SC 2.3.1 (clarões), conferido de novo com o movimento sozinho:
    - As trocas sozinhas são lentas (a mais rápida tem ~11 s de período). A troca de cor mantém a luminância.
    - O vídeo escurecido fica abaixo de 10% de luminância relativa, então nem o corte do loop é clarão.
    - Os nós têm de 1 a 8 px, abaixo da área que conta como clarão.
  - Contraste medido no Sobre, com o pior pixel de fundo atrás de cada bloco (fundo lido do canvas):
    - 1104 px: título 9,18:1; frase curta 12,04:1; essência 10,08:1; texto secundário 7,11:1.
    - 375 px: título 10,37:1; frase curta 12,17:1; essência 12,64:1; texto secundário 9,33:1.
    - Sem rolagem horizontal em 375 px nem em 1104 px.
  - Custo: a simulação exige WebGL2 com textura float. Sem isso, a descida fica sem os nós (vídeo e luzes continuam). Sem WebGL, não há descida e entra o arquivo oficial do símbolo parado.

## D-021: Vídeo visível, partículas no modelo do Active Theory e sem feixes retos na descida
- **Data:** 2026-11-07
- **Status:** vigente, exceto a floresta de nós (grafos de commits, nuvem e poeira) e o rastro de faíscas do cursor, substituídos pela D-022
- **Decisão:**
  - **Vídeo visível:** o vídeo continua de fundo, desfocado e em loop (D-020), mas sobe de ganho 0,065 para 0,34 na luz linear, para aparecer o tempo todo durante a rolagem. Continua sem ser o destaque: as luzes e os nós ficam por cima.
  - **Sem feixes retos:** saem os feixes finos na diagonal de 45° da D-019. A luz da descida fica só nos brilhos coloridos irregulares e no reflexo no metal.
  - **Partículas:** sai a nuvem GPGPU com ruído curl da D-020. Entra uma floresta de nós desenhada na GPU, com cerca de 29 mil nós (quadrados pequenos, de 1 a 4 px na maioria) em três camadas de profundidade:
    - grafos de commits em 3D: troncos verticais (as linhas do histórico) com ramos que saem e voltam a 45°, commits (cubos girados 45°) e copas (aglomerados de nós);
    - uma nuvem em volta do eixo do símbolo, densa perto do metal e rala nas bordas, feita de grupos pequenos de nós, como o borrifo de pontos em volta dos objetos no Active Theory;
    - poeira solta no fundo.
    Os nós ganham foco ou desfoque pela distância ao plano do símbolo (fora de foco, viram um losango de borda clara), passam na frente e atrás do metal e só ganham cor onde as luzes da descida batem; no resto, ficam fracos e frios. Uns 3% são brilhos nítidos que cintilam devagar. A câmera desce pela floresta e gira um pouco em volta do símbolo; rolando rápido, os nós se esticam na vertical.
  - **Cursor:** os nós perto dele acendem e se afastam um pouco, e ele deixa um rastro de faíscas (nós esticados na direção do movimento, em ciano e branco) que se apagam em cerca de 1 s, no modelo do rastro do Active Theory.
  - **Blender:** não foi usado. O Blender não estava aberto e as partículas do Active Theory são geradas em tempo real, não um modelo, então tudo é procedural no código.
- **Motivo:** pedido do cliente (dono da marca): "quando começo a scrollar, o video some. As particulas não estão iguais a do active. [...] veja a animação que elas fazem ao passar o cursor. Outra coisa, esses feixes de luz reto não quero".
- **Impacto:**
  - Substitui, na D-019, os feixes a 45° e a frase "o vídeo escurecido fica abaixo de 10% de luminância"; na D-020, o ganho do vídeo e a nuvem GPGPU.
  - Origem no conceito da marca: os nós são quadrados girados 45°; os grafos de commits têm ramos a 45° (matriz 45°); o desfoque tem a forma do nó; o rastro do cursor é feito de nós.
  - SC 2.3.1 (clarões), medido com `tools/flash-check.py` no vídeo com ganho 0,34 e teto 0,4: no pior bloco, 2 flashes em 1 s (o limite é 3). Luminância média 0,029, máxima 0,229. Os nós e as faíscas são pequenos, abaixo da área que conta como clarão, e acendem e apagam em 1 s ou mais.
  - Contraste: o texto só aparece nos cortes, e depois do corte do Sobre o vídeo, os nós e as faíscas são descartados. As medidas da D-020 no Sobre continuam valendo.
  - Desempenho: 144 quadros por segundo estáveis na descida (tela de 1079 px, dpr 1). Em telas pequenas, desenha 60% dos nós. Sem rolagem horizontal em 375 px.
  - Custo: a floresta exige WebGL2 (instâncias). Não precisa mais de textura float.

## D-022: Símbolo que pulsa e partículas redondas na descida, no modelo do Active Theory
- **Data:** 2026-11-08
- **Status:** vigente, exceto o cursor (arrasto dos nós como fluido e o brilho perto do cursor), substituído pela D-023, e o teto do símbolo crescido (62% da altura e 78% da largura da tela), substituído pela D-030, e o movimento dos nós (fluxo de conta fechada), o desfoque leve e o risco vertical na rolagem, substituídos pela D-032
- **Decisão:**
  - **Símbolo que pulsa:** na descida, as 4 peças do símbolo em metal, além de girar (D-015), crescem e diminuem de tamanho duas vezes acompanhando a rolagem, entre cerca de 0,6x e 1,6x do tamanho da descida. Crescido, nunca passa de 62% da altura nem de 78% da largura da tela. Volta ao tamanho normal antes do corte do Sobre e pousa igual ao arquivo.
  - **Partículas:** sai a floresta de nós da D-021. Entra uma pluma de cerca de 67 mil nós em volta do eixo do símbolo, no modelo das partículas do Active Theory (técnica estudada nos shaders públicos do site deles; o código é nosso):
    - fitas em hélice em volta do eixo (cerca de 80% dos nós) e uma coluna rala no meio, com nós soltos pelo volume e uma camada funda bem pequena;
    - nós redondos de 1 a 5 px, quase todos pequenos; os maiores viram bolhas com sombreado de esfera, iluminadas do lado da luz mais forte;
    - cada nó pega a cor de uma das luzes da descida, o que forma lobos de cor em volta do símbolo; 12% têm cor própria da paleta da D-019. Só as cores da D-019 são usadas;
    - mistura aditiva por cima do vídeo, com teto de brilho por nó;
    - cada nó nasce, sobe um pouco num fluxo, apaga e renasce.
  - **Cursor:** saem as faíscas da D-021. O rastro do cursor arrasta os nós de leve, como um fluido (teto de 100 px), e eles voltam devagar; os perto do cursor acendem um pouco.
  - **Blender:** não foi usado. As partículas do Active Theory são simulação em tempo real na GPU, não um modelo 3D, então tudo é procedural no código.
- **Motivo:** pedido do cliente (dono da marca): "O logo da genial que desce rodando, deve vir aumentando e diminuindo de tamanho. As particulas ainda nao estão nada parecidas com a do active." Sobre o nó redondo: "ignore um pouco dessa questão de proibição da marca, até pq a marca é minha".
- **Impacto:**
  - Amplia a exceção da D-015 (o símbolo também muda de tamanho na descida). Substitui, na D-021, a floresta de nós e o rastro de faíscas. O `CLAUDE.md` registra as duas exceções.
  - Origem no conceito da marca: as partículas são os nós. O nó redondo, em vez do quadrado, é escolha declarada do dono da marca, só na descida.
  - SC 2.3.1 (clarões): o vídeo não mudou (2 flashes em 1 s no pior bloco, medido na D-021). Os nós são pequenos, abaixo da área que conta como clarão, e o brilho de cada um sobe e desce em 3 s ou mais. O pulso do símbolo é uma mudança de tamanho lenta, sem troca de brilho.
  - Contraste: o texto só aparece nos cortes; depois do corte do Sobre, os nós são descartados. As medidas da D-020 no Sobre continuam valendo.
  - Desempenho: cada quadro da descida custa cerca de 1 ms de JavaScript e de 1 a 11 ms de GPU (tela de 1079 px, dpr 1, Radeon RX 580). No painel de navegador do app, o quadro só aparece a cada ~1 s, mas o site do Active Theory fica igual (2 quadros por segundo) no mesmo painel, então o limite é do painel, não do site. A taxa num navegador comum ainda não foi medida. Os 144 quadros por segundo da D-021 coincidem com a taxa da página quando o canvas não desenha nada e não valem como medida da descida. Em telas pequenas, desenha 55% dos nós.
  - Custo: exige WebGL2 (instâncias). Sem WebGL, não há descida e entra o arquivo oficial do símbolo parado.

## D-023: Traços saindo do cursor na descida, no lugar do arrasto
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **A nuvem não se deforma mais:** sai o arrasto dos nós como fluido da D-022 e o brilho dos nós perto do cursor. O cursor só desloca a nuvem inteira um pouco pela profundidade (paralaxe), sem mudar a forma dela.
  - **Traços:** o movimento do cursor solta traços finos ao longo do caminho, no modelo do Active Theory (observado no site deles; o código é nosso):
    - um traço a cada 9 px de caminho (até 14 por quadro e 480 ao mesmo tempo); o cursor parado ou muito lento (abaixo de 40 px/s) não solta nada;
    - cada traço sai no sentido do movimento, um pouco aberto para os lados, com 10% a 30% da velocidade do cursor (teto de 620 px/s), freia, faz uma curva leve, se estica até 56 px e apaga em 0,9 a 1,9 s;
    - cabeça branca e cauda que afina e escurece, com a cor de uma das luzes da descida (D-019), sorteada: rosa 42%, ciano 24%, violeta 16%, laranja 12%, verde-limão 6%;
    - mistura aditiva, por cima do símbolo e da nuvem; só entre o corte da entrada e o corte do Sobre, como a nuvem.
- **Motivo:** pedido do cliente (dono da marca): "o efeito de mouse em cima da estranho, o movimento do cursor distorce elas. O movimento do cursor deve trazer aquela animação de tipo traços saindo, igual é no active".
- **Impacto:**
  - Substitui, na D-022, o cursor (arrasto como fluido e brilho perto do cursor). O resto da D-022 continua valendo.
  - Origem no conceito da marca: os traços são nós em movimento (o mesmo nó redondo da D-022, esticado pela velocidade, como o rastro da rolagem). As cores são só as da luz da descida (D-019).
  - SC 2.3.1 (clarões): cada traço tem de 1 a 3 px de espessura, acende uma vez e apaga devagar (0,9 a 1,9 s), sem piscar. Mesmo com muitos traços juntos, a área acesa fica muito abaixo da que conta como clarão.
  - Contraste: o texto só aparece nos cortes e os traços são descartados fora da descida, como a nuvem. As medidas da D-020 no Sobre continuam valendo.
  - SC 2.2.2: os traços só existem enquanto o cursor se move (respondem ao usuário, não andam sozinhos) e duram menos de 2 s.
  - Desempenho: os traços são uma malha à parte com 480 quads; a posição sai de uma conta fechada no shader, e os dados só sobem para a GPU quando nasce um traço.
  - Teste: no painel de navegador do app, com o relógio da descida avançado à mão (gancho temporário, já removido), em 1094 px e em 375 px (sem rolagem horizontal). A aparência numa taxa de quadros normal ainda não foi vista num navegador comum.

## D-024: Portfólio em espiral de cards de vidro, no modelo do Active Theory
- **Data:** 2026-11-09
- **Status:** vigente, exceto: no item "Corte do Sobre para o portfólio", o que some pelo corte (substituído por D-025); no item "Espiral", o raio, o passo e a descida, e o item "Título" inteiro (substituídos por D-029); no item "HTML", o painel com os dados do projeto da vez (substituído por D-028). A espiral e o centro, que a D-026 tinha trocado, voltaram a valer pela D-027
- **Decisão:**
  - **Corte do Sobre para o portfólio:** o mesmo corte "/" com a borda de nós dos cortes da entrada e do Sobre, de baixo à direita para o alto à esquerda. Os detalhes do Sobre (Pilares e A Empresa) somem pelo corte; do outro lado entra o portfólio.
  - **Espiral:** os projetos são cards de vidro grosso em volta de um eixo vertical (raio 3,8), cada um olhando para fora e um pouco abaixo do anterior. A câmera para de frente para um card de cada vez e, com a rolagem, gira e desce até o próximo, no modelo do Active Theory (técnica estudada no site deles; o código é nosso).
    - Por enquanto são 2 projetos, em lados opostos do eixo (180°). A rolagem dá uma volta inteira em volta do eixo: começa meio passo antes do primeiro card, para de frente para cada um e termina meio passo depois do último.
    - Com mais projetos, o passo é 360° dividido pelo número de projetos, no mínimo 50° (o passo do Active Theory).
    - Perto de cada card a câmera anda mais devagar (o card da vez fica um tempo de frente); entre um e outro, mais rápido.
  - **Vidro:** o card distorce o que está atrás dele (refração em espaço de tela, com uma pequena separação de cor), tem reflexo de ambiente, bordas mais claras e um brilho leve perto do cursor. Na face, uma gravação fraca da matriz 45°.
  - **Título:** na frente de cada card, o nome do projeto em caixa alta (fonte de títulos, D-018). Visto de lado, o título se fatia em 15 faixas e separa as cores (vermelho, verde e azul); de frente, fica inteiro e nítido.
  - **Centro:** uma coluna de nós subindo pelo eixo da espiral, como a nuvem da descida: nós redondos, quase todos prata e branco, cerca de 12% em ciano. A coluna gira com a rolagem.
  - **Entrada dos cards:** quando o corte começa, os cards crescem do zero em sequência (1,2 s cada, 0,2 s entre um e outro; tudo em menos de 2,2 s).
  - **HTML:** título "Portfólio", índice dos projetos (links para cada trecho da rolagem; o projeto da vez é marcado com o nó em losango, texto branco e `aria-current`, não só por cor), painel com os dados do projeto da vez e contador "01 / 02". Sem WebGL, entra uma lista simples com os mesmos dados.
  - **Conteúdo:** os 2 projetos são o Carby e o Devity (nomes dados pelo cliente). Cliente, ano, tipo, resumo, imagem e vídeo ficam como "Pendente" até o cliente informar.
  - **Vídeo no card da vez:** o mecanismo fica pronto, mas desligado. Vídeo tocando sozinho no card precisa de autorização do cliente (seria exceção ao SC 2.2.2).
  - **Depois:** filtro por categoria e página de cada projeto. Sem chat de IA.
- **Motivo:** pedido do cliente (dono da marca): "Quero um portfólio identico ao da active. [...] a seção que tem o texto, deve sumir essa parte, ter aquele corte lateral e dar na seção do portfólio. quero principalmente, a animação de quando scrollar, o "projeto" ir mudando, identico ao deles." Pacote aprovado: "Sim, recomendado". Sobre os projetos: "vai ser uma "tela de projeto" para o carby e outra para o devity [...] A principio, faça dar uma volta onde mostre os 2".
- **Impacto:**
  - Amplia a exceção do nó redondo da D-022 para a coluna de nós do portfólio. O `CLAUDE.md` registra.
  - Origem no conceito da marca: cards na matriz (passo fixo de ângulo e altura), coluna de nós, borda de nós no corte, gravação 45° no vidro. O título fatiado vem das faixas da matriz.
  - Cores: só ciano (acento, cerca de 12% dos nós e o brilho do cursor) e prata/branco. Nada das cores da D-019 fora da descida.
  - SC 2.2.2: a coluna de nós e o brilho só se movem enquanto o usuário rola ou mexe o cursor; param cerca de 2 s depois. A entrada dos cards dura menos de 5 s. Nada anda sozinho por mais de 5 s.
  - SC 2.3.1: sem clarões; a separação de cor do título muda devagar, com o ângulo da câmera.
  - Contraste: o texto HTML fica sobre um véu escuro; medir por cima da cena antes de fechar a parte.
  - Desempenho: um canvas à parte, que só monta perto do portfólio e só desenha quando algo muda. Cada quadro desenha a cena duas vezes (fundo e coluna em meia resolução para a refração, depois a cena inteira).
  - Pendências do cliente: para o Carby e o Devity, cliente (e se pode aparecer), uma frase, ano, tipo, imagem e vídeo; autorização do vídeo tocando sozinho.

## D-025: Sobre sem Pilares e A Empresa; o corte do portfólio sai da primeira tela do Sobre
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - O Sobre fica só com a primeira tela: título "Isso que é ser Gniall.", símbolo e texto (essência e zero lock-in). Saem os 5 pilares e o bloco "A empresa" (fundação, sede e equipe).
  - O corte "/" do portfólio (D-024) passa a levar embora essa primeira tela: o Sobre inteiro fica só do lado de antes do corte, antes da borda de nós, e sobe a 40% da velocidade da página enquanto o corte passa. O símbolo em metal acompanha o lugar dele e some do lado de depois, onde o canvas do portfólio pinta por cima.
  - No celular, se a primeira tela for mais alta que a tela, o corte começa quando o fim do texto chega ao pé da tela.
- **Motivo:** pedido do cliente (dono da marca), sobre a tela dos Pilares e de A Empresa: "remova isso".
- **Impacto:**
  - As pendências de fundação, sede e equipe saem do site (não são mais pedidas ao cliente para esta página).
  - Os 5 pilares do manual (§1) deixam de aparecer no site; continuam no documento de identidade.
  - Contraste e foco: o texto do Sobre continua só do lado de antes do corte, antes da borda de nós, sobre o mesmo Azul Noturno. Nenhum controle novo.
  - Movimento: nada novo; tudo segue a rolagem.

## D-026: Holograma do símbolo numa base de LED no centro do portfólio, no modelo do igloo.inc
- **Data:** 2026-11-09
- **Status:** suspensa pela D-027: fora do site, com o código guardado em `arquivo/portfolio-holograma-D026/` para poder voltar; volta pela D-040 como seção própria (mostruário) depois do portfólio, sem os cards
- **Decisão:**
  - **Centro:** no lugar da coluna de nós da D-024, uma base de LED em degraus projeta o símbolo oficial como holograma. A base é pedra em Azul Noturno, com uma fita de LED na borda de cada degrau, gravação fraca da matriz 45° no topo dos degraus e, em cima, a lente: uma matriz de LEDs em nós quadrados, com um anel aceso em volta. Da lente sai um feixe até um anel de luz acima do símbolo; no chão, a luz das fitas e a matriz 45° bem fraca. Técnica estudada na penúltima seção do igloo.inc (figura de pontos sobre uma base com LEDs) e no estudo de caso deles (https://www.awwwards.com/igloo-inc-case-study.html); o código é nosso e nada do site deles foi copiado.
  - **Holograma:** cerca de 10 mil pontos redondos (6.500 em telas com menos de 700 px de largura), tirados da superfície das 4 peças do símbolo oficial extrudado (o mesmo arquivo da D-013). Cada ponto é uma esfera pequena sombreada, na cor do arquivo (ciano, clareando para o branco), com linhas horizontais e uma faixa de varredura que dão o ar de projeção. O símbolo acompanha a câmera com atraso (no máximo 34°) e inclina um pouco na direção do cursor. O nome e a assinatura não entram.
  - **Formação:** quando o portfólio entra, os pontos saem da lente, sobem e fecham no lugar, de baixo para cima, em 2 s.
  - **Esfarelar:** com o cursor em cima do símbolo, os pontos perto dele se soltam na hora e o esfarelar se espalha até o símbolo todo (1,4 s). No celular, um toque curto no símbolo esfarela por 1,2 s. Sem cursor em cima, o símbolo se refaz de fora para dentro (1,6 s) e volta sempre inteiro.
  - **Fatias:** com a câmera girando rápido, faixas "/" da matriz deslizam pelo holograma e acendem; com a câmera parada, somem.
  - **Órbita:** a espiral da D-024 vira uma órbita plana (raio 3,6) em volta da base: a câmera só gira, não desce. O card da vez fica embaixo do holograma, na frente da base (na tela larga, abaixo da lente, para a fonte da luz aparecer inteira). O card do lado de trás escurece e encolhe até sumir, para não cruzar o holograma.
  - **Painel:** na tela larga, o véu de baixo, de ponta a ponta, dá lugar a um véu atrás do índice e outro atrás dos dados, e o meio fica livre para a base e o card da vez.
- **Motivo:** pedido do cliente (dono da marca), com 3 imagens da penúltima seção do igloo.inc: "Na parte do portfólio, no centro, queria algo tipo isso, onde os projetos girasse em volta, só que o centro, seria o logo da gniall. o site de referencia seria o igloo.inc, a penultima seção. Quando o cursor interage com o pinguim nesse site, ele esfarela todo. Queria que, o logo no centro, meio que nessa base projetando ele tipo com um led."
- **Impacto:**
  - Nova exceção às regras do logo: no centro do portfólio, o símbolo oficial pode virar holograma de pontos, esfarelar perto do cursor e se refazer. Sem cursor em cima, ele volta inteiro. Sem WebGL, entra a lista simples, sem o símbolo. O `CLAUDE.md` registra.
  - Amplia a exceção do nó redondo (D-022, D-024) para o holograma.
  - Origem no conceito da marca: o símbolo de tag (o próprio arquivo), os nós (os pontos que se soltam e voltam ao lugar, como uma entrega que se refaz) e a matriz 45° (lente em nós quadrados, gravação dos degraus, chão e fatias "/").
  - Cores: o holograma usa a cor do próprio arquivo (ciano), como o metal ciano da D-013. É a única área grande em ciano do site, e só porque é o símbolo. LEDs, feixe e anel: ciano misturado com prata e branco. Nenhuma cor da D-019.
  - SC 2.2.2: a varredura, o balanço dos pontos soltos e as fatias só andam com o relógio de atividade (enquanto o usuário rola ou mexe o cursor; param cerca de 2 s depois). A formação dura 2 s e o esfarelar responde ao cursor. Nada anda sozinho por mais de 5 s.
  - SC 2.3.1: sem clarões. A faixa de varredura leva cerca de 7 s para atravessar o símbolo, e o esfarelar acende cada ponto uma vez, devagar.
  - Contraste: na tela larga, o índice e os dados têm cada um o próprio véu (0,9 atrás do texto, que só se apaga fora da caixa do texto); o véu de baixo, de ponta a ponta, sai para a base aparecer inteira. No celular, o véu de baixo continua o mesmo. Medido no pior caso (branco puro atrás do véu): texto secundário 8,2:1 na tela larga (1094 px) e 7,3:1 no celular (375 px).
  - Desempenho: os pontos são um único desenho; a seleção do cursor é uma conta na CPU (raio até o plano do símbolo e uma grade de ocupação), sem leitura da GPU. O primeiro passe (meia resolução, para a refração do vidro) desenha fundo, base e holograma.
  - Teste: no painel de navegador do app, em 1094 px e em 375 px (sem rolagem horizontal): formação, esfarelar inteiro com o cursor em cima e volta inteira com o cursor fora, corte do Sobre para o portfólio, `pnpm -s typecheck` e `pnpm build`. O painel roda a cerca de 3 quadros por segundo; a aparência e o desempenho numa taxa de quadros normal ainda não foram vistos num navegador comum.

## D-027: Portfólio volta à espiral de cards; o holograma fica guardado
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - O portfólio volta à versão da D-024 com a D-025: cards de vidro numa espiral em volta da coluna de nós, com a câmera girando e descendo de um card para o próximo.
  - A versão do holograma (D-026) sai do site, mas não é descartada. Os arquivos dela ficam em `arquivo/portfolio-holograma-D026/`, com um `README.md` que explica como voltar com ela. A pasta fica fora do build e da checagem de tipos (`tsconfig.json`, `exclude`).
  - A cópia guardada é a D-026 como estava. O ajuste de enquadramento feito em seguida (card maior, holograma menor) não entrou nela.
- **Motivo:** pedido do cliente (dono da marca): "na verdade, vamos voltar pra outra versão e tentar trabalhar ela. Nao descarte esse pedestal com o logo ainda". Antes disso, sobre a versão do holograma: "O destaque precisa ser o projeto, e as texturas estoa muito simples".
- **Impacto:**
  - A exceção do logo da D-026 fica suspensa: o símbolo não aparece no portfólio. O `CLAUDE.md` registra.
  - O nó redondo no portfólio volta a ser só o da coluna (D-024).
  - Cor, movimento, contraste e desempenho: valem de novo os da D-024 e da D-025. Nada novo.

## D-028: Portfólio sem o painel de dados pendentes
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - Sai do portfólio o painel com "Cliente", "Ano", "Tipo" e "Resumo pendente" (as caixas tracejadas de "Pendente"), na cena e na lista simples sem WebGL.
  - Os dados continuam em `components/portfolio/projects.ts`, como `null`. Campo `null` não aparece no site: quando o cliente informar um dado, só ele aparece no painel (e no texto do índice para leitor de tela).
- **Motivo:** pedido do cliente (dono da marca), com um recorte do painel: "remove isso".
- **Impacto:**
  - Exceção à regra de deixar a pendência explícita no lugar (CLAUDE.md › Conteúdo), decidida pelo dono da marca. Nada é inventado: o site só deixa de mostrar o que falta. As pendências do Carby e do Devity seguem registradas na D-024.
  - O texto do índice para leitor de tela deixa de dizer o que está pendente; passa a ler só os dados informados (hoje, nenhum).
  - Contraste e foco: nada novo; o índice continua sobre o mesmo véu.

## D-029: Cards mais perto um do outro e título na proporção do Active Theory
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **Espiral:** passo fixo de 50° entre cards (o do Active Theory), raio 3,1 e descida de 0,65 por card. Na tela larga, o card da vez ocupa 44% da largura da tela (80% no celular), e sobra lugar para o vizinho aparecer ao lado.
  - **Título:** menor, na proporção do Active Theory: a altura das maiúsculas fica em cerca de 12% da altura do card, em Plex 300 (fonte de títulos, D-018) com espaçamento de 0,16 entre letras, numa faixa de 90% da largura do card. O título fica solto 0,2 na frente do vidro e, visto de lado, se desloca em relação ao card.
  - **Efeito de lado:** cada letra se repete em 1 a 4 cópias mais estreitas dentro da própria casa ("CCAARRBBYY"), com franjas em vermelho, verde e azul e, de vez em quando, um pequeno pulo para cima ou para baixo. As letras da ponta do lado de onde o card vem são as primeiras a se repetir e as últimas a voltar. O texto nunca passa da largura do título. De frente, fica inteiro e nítido.
  - O efeito depende só do ângulo do card em relação à câmera; o card da vez não se repete enquanto a câmera gira.
  - Técnica estudada no site do Active Theory; o código é nosso e nada do site deles foi copiado.
- **Motivo:** pedido do cliente (dono da marca): "Deixe os cartões de projetos mais próximos um do outro. igual é no active." Sobre a primeira versão do efeito, com o título esticado para fora do card: "Ta muito desproporcional e feio. Analise o projeto e replique".
- **Impacto:**
  - Origem no conceito da marca: as casas das letras são uma grade fixa (matriz) e as cópias repetem o passo dela.
  - Cores: as franjas são só a separação de cor do próprio texto branco, pequenas e só de lado. Nenhuma cor de marca nova.
  - SC 2.3.1: sem clarões; o efeito segue a rolagem.
  - SC 2.2.2: nada novo; nada anda sozinho.
  - Contraste: o título na cena é decorativo (o nome do projeto está no índice HTML). O halo escuro em volta das letras continua.
  - Teste: no painel de navegador do app, em 1094 px e em 375 px (sem rolagem horizontal). O painel roda a cerca de 3 quadros por segundo; a aparência numa taxa de quadros normal ainda não foi vista num navegador comum.

## D-030: Descida mais curta e símbolo maior
- **Data:** 2026-11-09
- **Status:** vigente, exceto as 2 voltas do símbolo, substituídas pela D-031
- **Decisão:**
  - O trecho fixo da entrada até o Sobre cai de 4,5 para 3 telas de rolagem. Os dois cortes diagonais continuam com o mesmo comprimento (cerca de 0,7 tela cada); só o meio da descida encurta, de cerca de 2,9 para 1,4 tela.
  - O símbolo continua dando só 2 voltas no eixo vertical, da entrada até o Sobre (já eram 2; agora numa rolagem mais curta), e continua crescendo e diminuindo 2 vezes (D-022).
  - Tamanho na descida: 1,7 vez o tamanho do símbolo no Sobre (antes, 1,2). Crescido, nunca passa de 78% da altura nem de 90% da largura da tela. Medido no painel do app: no computador (1094 × 854 px), cerca de 40% da largura da tela no tamanho normal e 58% no pico; no celular (375 px), cerca de 62% e 72%.
- **Motivo:** pedido do cliente (dono da marca), com uma imagem da descida: "Nessa seção, quero que a quantidade de scroll seja menor, ta muito longo, deixe o logo dando apenas 2 voltas. AUmente o tamanho dele e diminua". A mensagem terminou em "diminua"; foi lido como manter o símbolo crescendo e diminuindo, agora maior, e o cliente confirmou: "Sim, era isso".
- **Impacto:**
  - Logo: dentro das exceções da D-015 e da D-022 (giro e mudança de tamanho na descida); pousa no Sobre igual ao arquivo.
  - Movimento: giro, pulso, luzes e cores andam mais por rolagem, mas continuam seguindo a rolagem. O vídeo e a deriva sozinha das luzes (D-020) não mudaram.
  - SC 2.3.1: nada novo; o pulso é mudança de tamanho, sem troca de brilho, e as cores das luzes têm a mesma luminância.
  - Contraste: nada novo; o texto só aparece nos cortes.
  - Teste: no painel de navegador do app, em 1094 px e em 375 px (sem rolagem horizontal), do meio da descida até o símbolo pousar no Sobre. A sensação de velocidade numa taxa de quadros normal ainda não foi vista num navegador comum.

## D-031: Símbolo com uma volta inteira na descida
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - Na descida, o símbolo em metal dá uma volta inteira no eixo vertical (360°), não mais duas. A volta começa quando ele sai do logo e termina antes do corte do Sobre; daí até pousar no Sobre, ele fica de frente.
  - O verso do símbolo é quase igual à frente (o arquivo é quase simétrico), então cada meia volta parece uma volta. Com duas voltas inteiras, o símbolo ficava de frente 3 vezes na descida, e era isso que se via como "3 voltas". Com uma volta inteira, fica de frente 2 vezes: o verso, no meio da descida, e a frente, antes do corte.
- **Motivo:** pedido do cliente (dono da marca), depois da D-030: "ainda ta dando 3 voltas, quero somente 2".
- **Impacto:**
  - Logo: dentro da exceção da D-015 (o símbolo gira na descida e pousa de frente, igual ao arquivo).
  - Movimento: o giro fica mais lento por rolagem e continua seguindo a rolagem. Nada novo para SC 2.2.2 e SC 2.3.1.
  - Teste: no painel de navegador do app, em 1094 px: o verso de frente no meio da descida, a frente antes do corte e o pouso no Sobre.

## D-032: Partículas da descida com fluxo de fluido e profundidade de campo, sem borrão na rolagem
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **Sem borrão na rolagem:** sai o risco vertical que esticava os nós quando a página rolava rápido. Os nós ficam redondos e nítidos em qualquer velocidade de rolagem.
  - **Fluxo de fluido:** a posição de cada nó passa a ser simulada na GPU (uma textura com o desvio e a idade de cada nó, atualizada a cada quadro). Cada nó nasce no seu lugar da pluma da D-022, é levado por um campo de velocidade e, quando a vida acaba (4 a 10 s), renasce no lugar. O campo soma o rotacional de um ruído em duas escalas (sem divergência: vizinhos andam juntos, como fumaça), um giro em volta do eixo do símbolo e uma subida leve. Na primeira vez, a simulação roda cerca de 7 s de uma vez, para a pluma já aparecer em movimento.
  - **Profundidade de campo:** o plano do símbolo é o plano de foco. Fora dele, o nó vira um disco maior (até 26 px de raio numa tela de referência), macio e mais fraco, com a borda um pouco mais clara. As bolhas com sombreado de esfera ficam só nos nós em foco.
  - O resto da D-022 e da D-023 continua: a forma da pluma, os tamanhos, as cores da D-019, a mistura aditiva e os traços do cursor.
- **Motivo:** pedido do cliente (dono da marca): "quando scrollo as particulas embaçam tambem. corrija isso e faça 1 e 2" (1: movimento de fluido simulado na GPU; 2: desfoque de profundidade, como no Active Theory).
- **Impacto:**
  - Substitui, na D-022, o movimento dos nós por conta fechada, o desfoque leve e o risco da rolagem. A nuvem GPGPU da D-020 tinha saído na D-021 por causa do visual, não da técnica; a simulação volta só para mover os nós da pluma da D-022.
  - Técnica estudada no Active Theory; o código é nosso (o ruído e o campo foram escritos aqui).
  - Origem no conceito da marca: os nós (redondos na descida, D-022).
  - Movimento: dentro da D-020. A simulação só anda com a descida na tela; fora dela, para.
  - SC 2.3.1 (clarões): nenhum brilho novo. O disco de desfoque espalha a mesma luz numa área maior, então fica mais fraco que o nó em foco; o brilho de cada nó continua subindo e descendo em 3 s ou mais. O vídeo não mudou.
  - Contraste: nada novo; o texto só aparece nos cortes, e depois do corte do Sobre os nós são descartados.
  - Custo: a simulação exige WebGL2 com `EXT_color_buffer_float`. Sem a extensão, os nós seguem o fluxo de conta fechada de antes, com a profundidade de campo. Em telas pequenas, continuam 55% dos nós.
  - Teste: no painel de navegador do app, em 1094 px e em 375 px (sem rolagem horizontal, console sem erros). O painel desenha poucos quadros por segundo, então a fluidez do movimento e a taxa de quadros num navegador comum ainda não foram vistas.

## D-033: Borda de nós dos cortes falhando com o tempo
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:** a borda de nós quadrados dos cortes A, B e C (D-015, D-019, D-024) continua igual, mas passa a falhar sozinha: cada célula da borda sorteia de novo, em passos de 0,4 s com fase própria, se tem nó, se o nó é ciano e de que lado do corte fica. Uma linha limpa e ondulada no modelo do Active Theory chegou a ser testada e foi descartada pelo cliente ("volte pro outro estilo").
- **Motivo:** pedido do cliente (dono da marca): "Esses códigos da divisória devem ficar se mexendo, como se estivessem falhando".
- **Impacto:**
  - Origem no conceito da marca: os nós e a matriz 45°.
  - SC 2.3.1: cada nó troca no máximo 2,5 vezes por segundo, e os nós são pequenos (bem abaixo da área de clarão). O lado do corte troca no máximo 1,5 vez por segundo.
  - SC 2.2.2: a borda só aparece enquanto o corte está na tela, e o corte segue a rolagem. Se a página parar com um corte no meio da tela, a falha continua; fica sob o conflito em aberto do SC 2.2.2, decisão do dono da marca.
  - O tempo vai no quarto componente dos vetores do corte (1 + segundos), sem uniform novo.
  - Teste: no painel do app, em 1094 px, no corte C (os nós mudam entre quadros, console sem erros).
  - Durante o corte do portfólio, o escurecido do painel (degradês atrás da lista e do título) some: cortado reto pela linha, ele marcava uma faixa atrás dos nós. Pedido do cliente: "deve ficar somente os códigos falhando". Ele volta (0,4 s) quando o corte termina; enquanto o corte passa, a lista fica sobre o fundo escuro do portfólio.

## D-034: Sobre mais enxuto e com fundo vivo (matriz 45° revelada pela luz)
- **Data:** 2026-11-09
- **Status:** vigente, exceto a cor de fundo do Sobre, substituída por D-039
- **Decisão:**
  - Sai do Sobre o parágrafo "A soberania digital é do cliente…" (o zero lock-in continua na tela de entrada).
  - O fundo do Sobre ganha um brilho de metal escovado, sem grade: fios finos horizontais que só aparecem onde a luz bate (um reflexo largo e alongado que segue o cursor, a luz atrás do símbolo e um brilho diagonal que atravessa a tela a cada 12 s), com um toque de ciano no reflexo do cursor. Uma primeira versão com a matriz 45° e nós foi descartada pelo cliente ("Não quero esse efeito quadriculado. coloque um efeito luminoso apenas, mais metalizado").
- **Motivo:** pedido do cliente (dono da marca): "remova isso" e "Essa seção, preciso que deixe mais premium, com algum efeito no fundo, melhore".
- **Impacto:**
  - Origem: o metal do símbolo (D-013); decisão do dono da marca.
  - Movimento automático com mais de 5 s (o brilho diagonal), decisão do dono da marca, fora da D-020; fica sob o conflito em aberto do SC 2.2.2.
  - SC 2.3.1: nada pisca; o brilho passa suave em 12 s.
  - Contraste: no ponto mais claro do reflexo o fundo fica perto de #3A4A60; o texto branco continua acima de 8:1.
  - Teste: no painel do app, em 1094 px (console sem erros).

## D-035: Símbolo gira também na passagem para o Sobre
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:** além da volta da descida (D-031), o símbolo em metal dá mais uma volta no eixo vertical enquanto viaja do meio da tela até o lugar dele no Sobre (rolagem de 70% a 94% da passagem), e chega de frente.
- **Motivo:** pedido do cliente (dono da marca): "quando passa de uma seção pra outra, ele deve vir girando tambem".
- **Impacto:** dentro da D-015/D-022 (só as 4 peças do símbolo giram, seguindo a rolagem; nada anima sozinho). Sem WebGL, nada muda.

## D-036: Tela de entrada sem data center: vazio escuro com luz e pontos soltos
- **Data:** 2026-11-09
- **Status:** vigente (em avaliação pelo cliente), exceto a cor do fundo, a quantidade, o lugar e a cor dos nós soltos e o fato de ficarem parados, substituídos pela D-038
- **Decisão:**
  - O corredor de racks da D-014 sai da cena (racks, colunas e teto ficam desligados; o código continua em `datacenter.ts`). Ficam o fundo Azul Noturno com névoa e feixes de luz, o chão polido (agora largo e azul) que reflete o logo, e o logo em metal.
  - Os LEDs viram pontos soltos no escuro, espalhados dos dois lados de um vão livre no meio. Dos que não viram logo, fica um terço. São redondos (ponto macio em foco, disco com borda clara fora de foco) e de tamanhos variados.
  - Na rolagem, os pontos giram em volta do eixo vertical do logo, no mesmo ângulo do símbolo (D-031, D-035), no modelo das partículas do Active Theory.
  - A intro continua: os pontos acendem a partir da base do logo e os que formam o logo voam até ele.
- **Motivo:** pedidos do cliente (dono da marca): "Esse visual de data center não está legal", "Essas particulas estão muito feias" e "quero particulas igual as do active, que quando scrollo, elas giram junto com o logo".
- **Impacto:**
  - Substitui o cenário da D-014 (status dela: vigente, exceto o corredor de racks, substituído pela D-036).
  - Pontos redondos fora da descida: amplia a exceção da D-022, decisão do dono da marca.
  - Técnica estudada no Active Theory; o código é nosso.
  - Movimento: os pontos só se mexem com a rolagem (e na intro). Nada novo anima sozinho.
  - Contraste: o texto da entrada fica sobre o mesmo fundo escuro, com a área quieta atrás do texto (uQuietPx) mantida.
  - Teste: no painel do app, em 1094 px (intro, repouso e rolagem; console sem erros). Celular e fluidez num navegador comum ainda não vistos.

## D-037: Nós da borda dos cortes menores e pluma da descida girando junto com o símbolo
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - Os nós que falham na borda dos cortes (D-033) ficam menores: o lado passa de 60% para 42% da célula. A grade, o ritmo da falha e as cores não mudam.
  - Na descida, a pluma de nós gira em volta do eixo do símbolo no mesmo ângulo dele (as voltas da D-015 e da D-035), seguindo a rolagem. Antes girava só 0,06 volta na descida inteira.
  - A coluna do portfólio chegou a ganhar giro extra por engano de leitura do pedido; foi desfeito no mesmo dia e continua como na D-024.
- **Motivo:** pedidos do cliente (dono da marca): "Essas particulas de falhas devem ficar um pouco menor" e "na seção de baixo, as particulas devem girar também", esclarecido depois: "Na seção que o logo gira eu me refiro, as particulas devem girar quando scrollo".
- **Impacto:**
  - Origem no conceito da marca: os nós.
  - Movimento: o giro segue só a rolagem; parado, não gira sozinho além do que a D-024 já permite. SC 2.3.1: nenhum brilho novo.
  - Contraste: nada novo; os limites do texto em volta da borda não mudaram.
  - Teste: typecheck e build. Fluidez num navegador comum e celular ainda não vistos.

## D-038: Entrada no tom do Active Theory: fundo quase preto e pouca poeira branca e ciano perto do logo, flutuando
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **Fundo:** a tela de entrada sai do Azul Noturno e vai para um quase preto puxado para o azul (`#0A1216` no centro, `#040708` nas bordas), com uma luz fria larga no canto de cima à esquerda (`#17364A`). Os feixes ficam mais fracos. O chão polido usa o mesmo tom. Vale só para a entrada: o Sobre, a descida e o portfólio continuam como estavam.
  - **Poeira:** os nós soltos deixam de ficar espalhados pela tela. Ficam poucos (cerca de 2% dos pontos), em duas nuvens soltas, uma de cada lado do logo, do símbolo até o chão, com alguns espalhados em volta. São brancos e ciano, as cores do logo (cerca de 45% em ciano). Uma versão dourada foi testada e trocada no mesmo dia a pedido do cliente. Presos ao símbolo: giram e descem com ele na rolagem (D-036, D-037).
  - **Movimento:** a poeira flutua devagar sozinha (laços pequenos, ciclos de 20 a 40 s) enquanto a entrada está na tela.
  - Os pontos que viram logo na intro não reacendem depois de sair.
  - Uma fita de metal ligada ao símbolo, no modelo do laço do Active Theory, foi feita e retirada no mesmo dia a pedido do cliente ("Esse fio que liga ficou ruim. remova ele").
- **Motivo:** pedidos do cliente (dono da marca): "queria essa tela mais igual ao active. Mesma cor, poucas particulas proximas ao logo"; "Deixe as particulas iguais as do active"; "As particulas devem ser de outra cor, deixe menos particulas, e elas devem se mover suavemente"; "deixe menos particulas, e brancas e azuis da cor do logo".
- **Impacto:**
  - **Exceção de cor, decisão do dono da marca:** o fundo da entrada deixa de ter `#0C1E36` como cor dominante. Só na entrada e só no fundo; texto, botões e ícones não mudam. A poeira usa só cores do manual (branco e Ciano Cibernético), em pontos pequenos.
  - **Exceção ao SC 2.2.2, decisão do dono da marca:** a poeira se move sozinha por mais de 5 s, sem botão de pausa, como na D-020. Fora da entrada, para.
  - SC 2.3.1: nada pisca; o movimento é lento e o brilho de cada ponto não muda.
  - Contraste: o fundo ficou mais escuro, então o texto branco ganha contraste; a poeira continua apagada em 92% na caixa do nome e do texto. Não foi medido de novo.
  - Técnica no modelo do Active Theory; o código é nosso.
  - Custo: a entrada passa a desenhar todos os quadros enquanto está na tela (antes, só quando algo mudava).
  - Teste: no painel de navegador do app, em 800 px de largura, parado. Movimento, celular e taxa de quadros num navegador comum ainda não vistos.

## D-039: Sobre no modelo do "about" do Active Theory (título grande, símbolo de lado no centro, texto à direita, fundo escuro)
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **Posição (computador, 900 px ou mais):** grade de 24 colunas. O título começa a cerca de 1/5 da largura e fica maior (7,4% da largura da tela, peso 400). O símbolo fica no centro, maior (até 46% da largura ou 80% da altura), por cima do fim do título. O texto fica à direita do símbolo, da metade da tela para baixo, um pouco maior.
  - **Símbolo virado de lado:** no Sobre, o símbolo em metal para em três quartos (0,95 rad no eixo vertical), não mais de frente. O reflexo do ambiente gira junto, para o metal não escurecer. Continua inclinando na direção do cursor.
  - **Título inteiro:** as letras do título não são cortadas. Um recorte oval foi testado e retirado a pedido do cliente ("cortou as letras, volte pro jeito que estava"). Com isso, letras brancas podem ficar por cima do símbolo ciano; contraste a medir.
  - **Fundo:** o Sobre sai do azul noturno e usa o mesmo tom quase preto da entrada (D-038), com uma luz fria entrando pela esquerda. O metal escovado e a luz do cursor da D-034 continuam.
  - **Celular:** a ordem empilhada (título, símbolo, texto) continua; só mudam a pose de lado e o fundo.
- **Motivo:** pedido do cliente (dono da marca), com uma captura do "about" do Active Theory: "A segunda seção deve ficar idêntica a esta. O logo ficando nessa mesma posição, as fontes, o tamanho".
- **Impacto:**
  - Substitui, na D-015, o repouso "de frente" do símbolo no Sobre, e na D-034 a cor de fundo do Sobre. Exceção do dono da marca à regra do azul noturno dominante, como na D-038.
  - **Fonte:** a do Active Theory é a NB Architekt (D-018). Os arquivos da licença ainda não chegaram, então o título segue em IBM Plex Sans. Quando chegarem, basta apontar `--font-family-display`.
  - Durante a chegada do símbolo (ele ainda girando), ele pode passar por cima de letras do título por um instante; em repouso, não.
  - Contraste: texto branco sobre o fundo quase preto é maior que sobre o azul noturno; ainda falta medir de novo por cima do metal escovado e da luz da esquerda.
  - Teste: painel do app em 1094 px e 375 px, sem rolagem horizontal. Não visto em telas largas (1920 px) nem num navegador comum.
  - **Revisão (mesmo dia):** a pedido do cliente ("tá ruim, deixe como era antes, com espaçamento e o logo no meio"), a posição volta à de antes (título, símbolo e texto em colunas separadas, com espaço entre eles; título no tamanho anterior). Ficam desta decisão só a pose de lado do símbolo e o fundo escuro.
  - **Segunda revisão (mesmo dia):** a pedido do cliente ("Voltar de frente"), o símbolo volta a parar de frente no Sobre (`REST_YAW = 0`), como na D-015. Desta decisão fica só o fundo escuro do Sobre.

## D-040: Mais uma volta do símbolo na saída do Sobre e mostruário com o holograma depois do portfólio
- **Data:** 2026-11-09
- **Status:** vigente
- **Decisão:**
  - **Saída do Sobre:** enquanto o corte do portfólio passa, o símbolo em metal dá mais uma volta no eixo vertical, desce até o meio da parte de baixo da tela e diminui (até 45%). O corte o cobre no caminho.
  - **Portfólio:** continua a espiral de cards (D-024, D-027, D-028, D-029).
  - **Mostruário:** nova seção depois da espiral, com a base de LED e o símbolo em holograma de pontos da D-026 (formação, esfarelar com o cursor ou no toque, volta inteiro). Não tem cards. A tela fica presa enquanto a página rola 2 telas, e a rolagem gira a câmera devagar em volta da base. Código em `components/showcase/`, copiado da versão guardada em `arquivo/portfolio-holograma-D026/`.
  - Sem WebGL, o mostruário não aparece (é só visual).
- **Motivo:** pedido do cliente (dono da marca): "quero mais uma volta de giro na seção do portfólio, e desce e deve aparecer aquele mostruário com o logo", e em seguida: "Não é pro mostruário ser o portfólio, o portfólio deve ser lá na espiral e depois dela mostrar o mostruário".
- **Impacto:**
  - A exceção do logo da D-026 volta a valer, só no mostruário. O `CLAUDE.md` registra.
  - Movimento: o holograma tem linhas e varredura que se movem sozinhas enquanto ele está na tela; é a mesma exceção que o dono da marca aceitou na D-026.
  - Contraste: a seção não tem texto.
  - Ainda não feito: um título ou texto no mostruário (não foi pedido) e a descida do símbolo de metal emendando direto no holograma (hoje o corte cobre o metal e o holograma se forma na seção seguinte).
  - Teste: painel do app em 1094 px. Não visto no celular nem num navegador comum.

## D-041: Coluna de nós do portfólio volta a ser uma espiral trançada
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:** na coluna de nós do portfólio (D-024), as fitas em hélice viram uma trança de 3 fios finos: cada fio gira em volta do eixo e entra e sai em relação aos outros, cruzando por cima e por baixo. O miolo e os nós soltos continuam. Código: `columnVertex` em `components/portfolio/shaders.ts`.
- **Motivo:** pedido do cliente (dono da marca): "quero que no portfólio, as partículas voltem a formar aquele espiral trançado".
- **Impacto:** só a forma da coluna muda; cores, quantidade de nós e movimento seguem iguais. Teste: painel do app em 1094 px.

## D-042: Fios da trança mais grossos; coluna e vidro do portfólio se movem sozinhos
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:** os 3 fios da trança (D-041) ficam mais grossos. Enquanto o portfólio está na tela, a coluna de nós e as ondas do vidro dos cards se movem sozinhas, sem precisar rolar nem mexer o cursor. Fora da tela, voltam a parar.
- **Motivo:** pedido do cliente (dono da marca): "as ondas devem ser um pouco mais grossas, e o efeito de vidro translúcido e das ondas espirais devem continuar se movendo mesmo sem mexer".
- **Impacto:** exceção declarada ao SC 2.2.2 (movimento automático com mais de 5 s, sem pausa), como a D-020 na descida. Vale só no portfólio. Nada pisca.

## D-043: Vídeo no card do Carby, títulos em Plex Mono e linha "Atendimento"
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:**
  - **Vídeo:** o card do Carby mostra o vídeo enviado pelo cliente (`public/media/portfolio/carby.webm` e `.mp4`, sem som, convertidos do arquivo original). Ele toca sozinho em loop, sem clique, só enquanto o portfólio está na tela. Fica atrás do vidro: escurecido, meio desfocado, translúcido e com refração. As partículas da coluna não passam por cima do card com vídeo.
  - **Títulos dos cards:** IBM Plex Mono 500, da mesma família IBM Plex, meio opacos, como se estivessem no vidro.
  - **Linha acima do título:** "ATENDIMENTO" no card do Carby, em Plex Sans, pequena, espaçada e translúcida. Campo `tag` em `projects.ts`.
- **Motivo:** pedidos do cliente (dono da marca): "Coloque esse vídeo no portfólio do Carby", "deve ficar passando na tela infinito, meio com blur", "meio translúcido... efeito de vidro bem presente", "fontes mais tech para os títulos", "em cima do título do Carby... escrito atendimento", "fonte meio opaca".
- **Impacto:**
  - A letra quadrada do modelo do Active Theory é a NB Architekt (D-018). Ela entra no título quando chegarem os arquivos da licença; até lá, a Plex Mono.
  - O vídeo se move sozinho; vale a mesma exceção da D-042.
  - Contraste do título sobre o vídeo não medido; o nome do projeto também está no índice em HTML.
  - Licença e autorização de uso do vídeo: a confirmar com o cliente.

## D-044: NB Architekt entra nos títulos grandes
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:** `--font-family-display` passa a ser a NB Architekt Pro R (D-018), com o arquivo que o cliente instalou no computador dele: `public/fonts/nb-architekt-pro-r.ttf`, copiado sem alteração. Vale para os títulos grandes em caixa alta: títulos dos cards do portfólio, título do Sobre e mostruário. A Plex Mono da D-043 sai.
- **Contorno:** o título dos cards fica sem o halo escuro em volta das letras.
- **Motivo:** o cliente pediu o título "nesse estilo, com essas fontes" (modelo do Active Theory) e confirmou que a licença dele é web.
- **Impacto:**
  - O arquivo está em TTF; o WOFF2 (menor) fica pendente, porque a conversão precisa de uma ferramenta que não está instalada.
  - Nos metadados do arquivo, a permissão de incorporação é "visualizar e imprimir". O cliente confirmou a licença web; o comprovante fica com ele.

## D-045: Texto do Sobre também em NB Architekt
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:** a frase de abertura e o texto do Sobre (à direita do símbolo) usam a NB Architekt, em caixa alta. Amplia a D-018, que a limitava aos títulos grandes; nas outras seções, o texto continua em IBM Plex Sans.
- **Motivo:** pedido do cliente (dono da marca), com captura do Sobre: "use ela aqui também".
- **Impacto:** a letra é mais estreita e técnica; legibilidade e contraste do texto pequeno a conferir no celular.

## D-046: Entrada volta ao data center, sem a poeira; paralaxe da câmera só na entrada
- **Data:** 2026-11-10
- **Status:** vigente
- **Decisão:**
  - A tela de entrada volta ao corredor de racks da D-014: racks, colunas, teto, LEDs nos racks e fundo Azul Noturno (o vazio quase preto da D-038 sai da entrada).
  - A poeira de pontos soltos (D-036, D-038) sai. A intro continua: os LEDs saem dos racks e formam o logo.
  - A paralaxe da câmera com o cursor fica só na entrada. No portfólio e no mostruário a câmera não se desloca mais com o cursor (nada de jogar a câmera para o lado nas bordas da página).
- **Motivo:** pedidos do cliente (dono da marca): "quero voltar o estilo de data center na primeira seção, igual estava antes, tirando as partículas" e "tire os movimentos de jogar a câmera pro lado quando o mouse passa nas extremidades da página".
- **Impacto:** substitui a D-036 e a parte da entrada da D-038 (a exceção de cor do fundo da entrada deixa de valer). O fundo escuro do Sobre (D-039) não muda.

## D-047: Acabamento premium do data center da entrada

- **Status:** vigente.
- **Data:** 2026-11-10.
- **Decisão:** o corredor da entrada (D-046) ganha acabamento mais caro, sem cor nova e sem mudar a composição:
  - racks mais escuros (grafite), com porta de vidro fumê: reflexo rasante (fresnel) e as duas faixas de luz do teto refletidas na horizontal pela porta;
  - linha fina de luz na quina de cada rack (perfil de alumínio);
  - piso elevado em placas de meio rack, com junta fina e reflexo variando de leve por placa (a grade modular da matriz);
  - luz das luminárias caindo no corredor.
- **Motivo:** pedido do cliente para deixar o data center mais premium.

## D-048: Símbolo dá só 2 giros inteiros

- **Status:** vigente. Substitui a volta extra na saída para o portfólio da D-040; o resto da D-040 continua.
- **Data:** 2026-11-10.
- **Decisão:** o símbolo dá 2 voltas inteiras no total: uma na descida (D-022) e outra a caminho do lugar no Sobre (D-035). A terceira volta, na saída do Sobre para o portfólio, sai. A descida até a base do holograma continua.
- **Motivo:** pedido do cliente.

## D-049: Projeto aberto reproduz a página de projeto do Active Theory

- **Status:** vigente.
- **Data:** 2026-11-10.
- **Decisão:** ao clicar num card do portfólio, o projeto abre como a página de projeto do Active Theory (referência: activetheory.net/work/welcome-to-hogwarts), reimplementada com código nosso (nenhum código ou arquivo do Active Theory é usado).
  - **Sala em perspectiva:** teto, chão, paredes e fundo, por raio, num shader de tela cheia. A parede do fundo tem a largura do painel. As superfícies são metal gasto: um reflexo bem borrado do vídeo (espelho), que some em manchas de desgaste de borda arrastada, com linhas finas e juntas escuras retas (a grade da matriz 45°). Longe do painel o metal fica quase preto, com grão. A câmera orbita um pouco na direção do cursor (suavizado). Revisão de 2026-11-10: a primeira versão usava faixas em blocos claros, que o cliente achou diferente da referência. Segunda revisão no mesmo dia, a pedido do cliente ("deixe dark, apenas os efeitos mais brancos e o reflexo do vídeo nas laterais"): a sala é escura; teto, chão e fundo mostram só manchas claras de desgaste, mais perto do painel; as paredes laterais refletem o vídeo (menos borrado), em réguas com juntas escuras e trechos de brilho diferente. Terceira revisão no mesmo dia, a pedido do cliente ("Tire os efeitos brancos. Deixe tudo preto/cinza escuro"): as manchas e o reflexo continuam, mas só em cinza escuro; nada claro fora do vídeo. Quarta revisão no mesmo dia, a pedido do cliente ("Deixe tudo preto"): a sala saiu; em volta do painel o fundo é preto liso, sem textura nem reflexo. É desvio da referência e da cor dominante da marca, por decisão do dono da marca, só nesta tela. Quinta revisão no mesmo dia, a pedido do cliente ("Agora, coloque o reflexo do vídeo rolando"): a sala volta, preta, e teto, chão e paredes laterais espelham o vídeo que roda no painel (um pouco borrado, escurecendo com a distância do fundo). O reflexo só se move porque o vídeo se move. Na mesma revisão o cliente mandou remover as placas Azul Noturno do texto: o título, a linha e o "Fechar" saem de cima do vídeo e vão para a faixa preta logo abaixo do painel, sem placa; o reflexo do chão debaixo do texto tem o teto de luminância 0,07 (o mesmo do aviso de cima). É desvio da referência (lá o texto fica sobre o vídeo), porque o vídeo do cliente é quase branco. Sexta revisão no mesmo dia, a pedido do cliente ("O reflexo deve ser bem esboçado, meio que atrás, se mexendo, e não nas 4 pontas. Ele deve ficar bem esfumaçado, rolando como uma sombra"): o espelho nas quatro paredes saiu; o reflexo é um halo bem borrado com a cor do vídeo, atrás do painel, que vaza em volta dele como fumaça e some no preto. A fumaça rola devagar sozinha enquanto o projeto está aberto: **exceção declarada ao SC 2.2.2, por decisão do dono da marca, só nesta tela** (como a D-020 na descida).
  - **Painel do vídeo** no fundo da sala: 84% da largura (90% no celular), centrado. Tem dois cantos chanfrados a 45° (em cima à esquerda e embaixo à direita, os delimitadores da tag) e espessura que aparece com a paralaxe.
  - **Entrada a partir do card:** dissolução em blocos de 12 px (os nós), com o lado direito por último. Abre em 2,2 s e fecha em 1,1 s.
  - **Texto:** "Role para fechar" logo acima do painel. Embaixo à esquerda, por cima do painel como no original: nome, linha e resumo, todos em caixa alta, e "< Fechar". A fonte é IBM Plex Sans no lugar da NB Architekt do original, pela D-018 (é texto pequeno).
  - **Contraste (WCAG):** nada escurece o vídeo (pedido do cliente: sem sombras por cima dele). Cada linha do texto de baixo tem a sua placa no Azul Noturno (`#0C1E36`), e o contraste não depende do vídeo: 16:1 no texto principal e cerca de 9:1 no secundário. Só a parede debaixo de "Role para fechar" tem teto de luminância (0,07). A placa é um desvio da referência, que põe o texto direto sobre o vídeo; com vídeo claro, isso ficaria ilegível.
  - **Interação:** o foco vai para o diálogo e volta ao card ao fechar. Fecha com rolagem, Esc, "Fechar" ou o Voltar do navegador (`?projeto=` no histórico). Abrir pela URL (`?projeto=` no carregamento) não é suportado.
  - **Movimento:** a "água" que se movia no fundo sai. Não há movimento automático contínuo além do vídeo.
  - **Ajustes de 2026-11-10 (pedidos do cliente: "O video está opaco", "O card não abre", "No pc ficou assim, trm que arrumar"):**
    - Cor do vídeo: o shader decodifica o vídeo de sRGB para linear antes de compor; antes ele saía lavado (codificado duas vezes).
    - Clique no card: valia só com o card parado de frente e o corte terminado (uma faixa de cerca de 240 px de rolagem). Agora vale enquanto o card for o da vez, inclusive durante o corte, só do lado já revelado.
    - Painel: segue a proporção dos vídeos (16:9), até 84% da largura (90% no celular) e 56% da altura, para o vídeo aparecer inteiro em telas largas. O texto de baixo alinha com a borda esquerda do painel.
    - Fumaça atrás do painel: mais escura (ganho 0,07) e mais curta, para o fundo continuar preto.
  - **Laterais do painel (2026-11-10, pedido do cliente: "nas laterais, coloque um pequeno texto informativo sobre o carby, nessa mesma fonte, e um botão chamado Acessar projeto que leva até a pagina gniall.com.br/carby" e "Remova o segundo print"):**
    - Sai o bloco de baixo (nome, "Atendimento" e "Fechar"). O nome do projeto continua no diálogo só para leitores de tela. Fecha com rolagem, Esc e o Voltar do navegador.
    - À esquerda do painel: o texto sobre o projeto (campo `about`), na mesma fonte e caixa alta. O texto do Carby é a descrição que o próprio cliente publicou na página do Carby (landing page da Carbotech), com ajuste mínimo de redação; falta a aprovação final do cliente.
    - À direita: "Acessar projeto", link para https://gniall.com.br/carby (campo `link`), na mesma aba. Borda cinza-clara, só o ">" no ciano.
    - Sem espaço nas laterais (menos de 300 px ao lado do painel), o texto e o botão ficam empilhados embaixo do painel.
    - Contraste: a luminância do fundo tem teto de 0,07 debaixo do texto e do botão (nova caixa `uSide`), o que dá pelo menos 8,7:1 para o texto branco.
  - **Fora do escopo:** a moldura do site do Active Theory (pílula Work/Contact, "Ask me anything", faixa de música) não entra. Os links do projeto também ficam de fora até haver dados reais.
- **Motivo:** pedido do cliente por uma reprodução fiel da página de projeto do Active Theory, sem simplificar. Isso reverte a direção anterior ("não parecer caixa, só textura, sem canto cortado"), porque o original tem sala em perspectiva, cantos chanfrados e espessura.
- **Impacto:** troca o fundo do projeto aberto em `components/portfolio/shaders.ts` (`detailFragment`) e o layout de `ProjectDetail`. Faltam conferir o fps real e o celular em aparelho físico.

## D-050: Mostruário entra visto de cima e desce até ficar de frente

- **Status:** vigente. Complementa a D-040.
- **Data:** 2026-11-10.
- **Decisão:** ao sair do portfólio para o mostruário, a câmera começa olhando a base de LED de cima (os anéis da base em volta da lente) e desce em arco, acompanhando a rolagem, até ficar de frente para o holograma. A descida ocupa os primeiros 60% da rolagem do mostruário; depois segue o giro lento da D-040.
- **Motivo:** pedido do cliente, com a transição para a penúltima seção do igloo.inc como referência (só a técnica; o código é nosso). Vem da matriz 45°: a mesma estrutura vista de cima e depois de frente.
- **Impacto:** `components/showcase/ShowcaseCanvas.tsx` (`DESCENT_END`, `DESCENT_PIVOT`, campo `top` da pose). Segue a rolagem; não é movimento automático.

## D-051: Passagem do portfólio para o mostruário por mergulho na névoa

- **Status:** vigente. Complementa a D-050.
- **Data:** 2026-11-10.
- **Decisão:** o mostruário sobe meia tela por cima do fim do portfólio e prende ali, sem corte de seção. Uma névoa no azul da marca fecha sobre o portfólio (meia tela de rolagem); atrás dela entra a cena, com a câmera bem alta, e ela mergulha até a vista de cima da base enquanto a névoa abre (mais 1,1 tela). Depois segue a descida da D-050. A névoa é um shader WebGL (`Fog.tsx`): camadas de fumaça em ruído fractal, em perspectiva, que a câmera atravessa e que derivam sozinhas enquanto estão na tela (D-052). Sem WebGL, a névoa não aparece e a cena entra direto.
- **Motivo:** pedido do cliente: a troca de seção estava com quebra forte; referência é a passagem do igloo.inc (só a técnica; o código é nosso). A névoa usa só tons do Azul Noturno, sem cor nova. Não foi preciso modelar nada no Blender.
- **Impacto:** `components/showcase/ShowcaseSection.tsx` (`DIVE`, variáveis `--fog`, `--deep`, `--scene`), `Fog.tsx` (shader da névoa), `ShowcaseSection.module.css` (trilho com `margin-top: -150svh` e 460svh) e `ShowcaseCanvas.tsx` (`dive`, `DIVE_FAR`).

## D-052: Névoa do mergulho com movimento próprio

- **Status:** vigente. Complementa a D-051.
- **Data:** 2026-11-10.
- **Decisão:** a névoa da passagem do portfólio para o mostruário deriva sozinha, em movimento contínuo, enquanto está na tela (e acelera um pouco logo depois de rolar). Fora da tela, para. Sem texto por cima da névoa enquanto ela se move. É exceção declarada ao SC 2.2.2, como a D-020, e vale só para essa névoa.
- **Motivo:** decisão do dono da marca: a névoa parada parecia estática; a referência (igloo.inc) tem fumaça viva.
- **Impacto:** `components/showcase/Fog.tsx` (`uTime`, velocidade da deriva); CLAUDE.md (exceção em Movimento).

## D-053: Holograma do mostruário como nanotecnologia

- **Status:** vigente, com o esfarelar substituído pela D-054. Complementa a D-026 e a D-040.
- **Data:** 2026-11-10.
- **Decisão:** no mostruário, o símbolo em pontos gira devagar no próprio eixo (0,22 rad/s) e cada ponto vibra de leve o tempo todo, enquanto o canvas está na tela; fora dela, para. Esfarelar ficou sutil: perto do cursor os pontos se soltam pouco, mais devagar, e ficam orbitando perto do lugar, sem perder a forma do símbolo; sem cursor, voltam inteiros. É exceção declarada ao SC 2.2.2, como a D-020 e a D-052, só para esse holograma.
- **Motivo:** decisão do dono da marca: a quebra estava forte demais; a referência é o comportamento do igloo.inc (só a técnica; o código é nosso).
- **Impacto:** `components/showcase/shaders.ts` (`uDrift`, deslocamento menor), `ShowcaseCanvas.tsx` (`SPIN`, `r.spin`, `CRUMBLE` mais lento); CLAUDE.md (exceção em Movimento).

## D-054: Esfarelar do holograma por rastro do cursor

- **Status:** substituída pela D-055. Substituía o esfarelar da D-053 (o giro e a vibração continuam).
- **Data:** 2026-11-10.
- **Decisão:** o holograma não se desfaz mais por inteiro a partir do ponto tocado. O cursor deixa um rastro de 8 marcas (uma a cada 0,06 s), cada uma apagando em 1,8 s. Perto do rastro, os pontos se soltam: a maioria fica perto, uns poucos voam longe. Soltos, seguem um fluxo de ruído e são arrastados na direção em que o cursor andou. Quando o rastro apaga, voltam devagar ao lugar. No toque, a marca é a mesma e apaga sozinha. Sem cursor em cima, o símbolo volta sempre inteiro (D-026).
- **Motivo:** decisão do dono da marca, com o efeito do igloo.inc como referência (só a técnica, observada no navegador; o código é nosso). A versão sutil da D-053 não se desfazia como lá.
- **Impacto:** `components/showcase/shaders.ts` (`uTrail` e `uTrailV` no lugar de `uReach`, `uHit` e `uCenter`), `ShowcaseCanvas.tsx` (`TRAIL` no lugar de `CRUMBLE`, rastro em anel).

## D-055: Holograma do mostruário simulado como líquido

- **Status:** vigente. Substitui a D-054 (o giro e a vibração da D-053 continuam).
- **Data:** 2026-11-10.
- **Decisão:** o deslocamento de cada ponto do holograma é simulado na GPU, com posição e velocidade em texturas (`GPUComputationRenderer`, que já vem no three; nenhum pacote novo).
  - O cursor empurra os pontos perto dele, para fora e no sentido em que andou. Cada ponto reage com força diferente, e uns poucos vão longe.
  - Soltos, os pontos seguem um fluxo de ruído sem divergência (curl), que dá o ar de líquido.
  - Uma mola amortecida os traz de volta. Quando o cursor sai, a agitação apaga em cerca de 0,45 s e a mola fica bem mais firme (o símbolo se refaz em cerca de 1,5 s), então o símbolo sempre volta inteiro (D-026).
  - Os passos da simulação têm no máximo 1/60 s, para o efeito ser o mesmo em qualquer taxa de quadros.
  - Ajuste de 2026-11-10, a pedido do dono da marca (estava lento demais): o empurrão é cerca de 4 vezes mais forte, o fluxo é mais rápido e a mola é fraca enquanto há agitação. Os pontos se espalham na hora e voltam rápido.
  - Só roda com o canvas na tela. Sem float render target, os pontos ficam parados (sem esfarelar).
- **Motivo:** decisão do dono da marca. O rastro da D-054 andava aos saltos (uma marca a cada 0,06 s), os pontos não tinham inércia e o efeito parecia estático. A referência é o igloo.inc (só a técnica; o código é nosso).
- **Impacto:** novo `components/showcase/holoSim.ts`; `shaders.ts` (`tOffset` e `aRef` no lugar de `uTrail`); `ShowcaseCanvas.tsx` (`STIR` no lugar de `TRAIL`).
