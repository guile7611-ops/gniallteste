# Site institucional Gniall

Novo site institucional da Gniall (software house: engenharia de missão crítica + IA aplicada, política de zero lock-in).

## Fase atual

**Implementação por partes**, autorizada pelo cliente em 2026-11-05. Stack em D-005. Ordem: (1) tela de entrada, (2) sobre a Gniall, (3) portfólio. Cada parte é mostrada ao cliente e lapidada antes da próxima.

## Documentos

- `docs/IDENTIDADE-VISUAL-GNIALL.md` — identidade visual completa. Ler antes de qualquer trabalho visual ou de conteúdo.
- `docs/decisoes.md` — registro de decisões do projeto.
- `docs/referencias/` — referências de direção criativa enviadas pelo cliente.

## Precedência

1. Especificações **oficiais** do manual (cores, tipografia, iconografia, logo). Nunca são sobrescritas.
2. Regras deste arquivo e decisões vigentes em `docs/decisoes.md`.
3. Itens marcados como **recomendação** no documento de identidade. Cedem à direção experimental quando houver conflito (ex.: "movimentos discretos").
4. Skills de terceiros em `.claude/skills/` (D-010). São referência técnica e cedem a tudo acima; conflitos conhecidos em `.claude/skills/README.md`.

## Identidade: 100% Gniall

Manual oficial: https://piv.agenciaquadri.com/gniall/

- `#0C1E36` (Azul Noturno Soberano) é a cor dominante.
- `#00D2D3` (Ciano Cibernético) é usado **só como acento**: nunca em grandes áreas, nunca em todos os botões.
- Cores funcionais (`#0FA37F`, `#1F426D`, `#E68A00`, `#D9383A`) apenas com seu significado de estado, nunca como decoração.
- Nenhuma cor de marca nova.
  - **Exceção (D-019), decisão do dono da marca:** na descida entre a entrada e o Sobre, as luzes podem usar violeta `#8B5CFF`, verde-limão `#B6FF3B`, laranja `#FF7A1A` e rosa `#FF3D8B`, além do ciano. Só na luz da descida (inclusive o reflexo no metal do símbolo), nunca em texto, botão, ícone ou fundo do resto do site.
- Tipografia: **IBM Plex Sans**, família única.
  - **Exceção (D-018), decisão do dono da marca:** NB Architekt só nos títulos grandes, em caixa alta, com os arquivos da licença web comprada pelo cliente (nunca de outra fonte). Arquivo em `public/fonts/` (D-044, licença web confirmada pelo cliente).
- Ícones: **Material Symbols Outlined**, biblioteca única. Sem emojis como ícone.

## Logo

- Usar somente os arquivos oficiais (https://piv.agenciaquadri.com/gniall/logotype.html), armazenados no projeto.
- Nunca redesenhar (em CSS, SVG ou texto), recolorir, rotacionar, distorcer nem aplicar efeitos (sombra, brilho, relevo, 3D, textura).
- Os efeitos experimentais do site nunca atingem o logo: ele não é animado, fatiado nem remontado. O conceito (tag, matriz, nó) pode virar grafismo; o arquivo do logo, não.
- **Exceção (D-009):** na tela de entrada, as 4 peças do símbolo oficial podem se montar com movimento, profundidade e luz. A animação termina sempre no logo oficial parado, idêntico ao arquivo.
- **Exceção (D-012):** na tela de entrada, o logo inteiro (símbolo, nome e assinatura) pode se formar com nós amostrados do arquivo oficial e se desfazer em nós perto do cursor. Sem cursor, o logo volta inteiro, idêntico ao arquivo.
- **Exceção (D-013):** na tela de entrada, o logo pode terminar e ficar em repouso como objeto de metal 3D, extrudado do arquivo oficial, com a silhueta do arquivo e as cores do próprio arquivo (ciano vira metal ciano, branco vira prata). Ele inclina e reflete luz na direção do cursor. Isso substitui, só nessa tela, o "final idêntico ao arquivo" da D-009 e o furo da D-012. Sem WebGL, entra o arquivo oficial.
- **Exceção (D-015, D-022):** na passagem da tela de entrada para o Sobre, só as 4 peças do símbolo em metal (D-013) podem girar, descer e crescer e diminuir de tamanho (D-022) acompanhando a rolagem, e ficar em repouso no Sobre, de frente, inclinando na direção do cursor. O nome e a assinatura ficam na tela de entrada. Sem WebGL, entra o arquivo oficial do símbolo (`sy-color-inverted.svg`) parado.
- **Exceção (D-026), de volta pela D-040 como seção própria depois do portfólio (o mostruário, `components/showcase/`, sem cards):** no mostruário, só o símbolo oficial pode virar holograma de pontos redondos, tirados do arquivo extrudado (D-013), nas cores do arquivo (ciano clareando para o branco), projetado por uma base de LED. Ele se forma saindo da lente, acompanha a câmera, esfarela perto do cursor (ou no toque) e, sem cursor em cima, volta sempre inteiro. Sem WebGL, entra a lista simples, sem o símbolo.
- Arquivos oficiais em `public/brand/oficial/`, baixados do banco de ativos do manual sem alterações.
- Respeitar a área de segurança (largura da letra "A") e os tamanhos mínimos: horizontal 150 px, vertical 100 px, símbolo 30 px.

## Conteúdo

- Tudo em pt-BR.
- Não inventar clientes, métricas, depoimentos, certificações, integrações ou resultados. Onde faltar dado real, deixar uma pendência explícita no lugar em vez de preencher.
- Tom de voz: pragmático, técnico, assertivo, orientado a resultado (ver §1 do documento de identidade).

## Direção criativa

- Site experimental/"absurdo", na linha de igloo.inc e das demais referências em `docs/referencias/`.
- Todo efeito precisa nascer do conceito da marca:
  - **matriz 45°**: grade modular, estrutura, previsibilidade;
  - **símbolo de tag**: delimitadores de código girados 45°, território e propriedade;
  - **nós**: pequenos quadrados, conclusão, commit, entrega.
- Teste para cada efeito: dá para dizer de qual desses três elementos ele vem? Se não der, sai.
  - **Exceção (D-022, D-024, D-026), decisão do dono da marca:** na descida e na coluna de nós do portfólio (e no holograma da D-026, se ele voltar), os nós podem ser redondos (pontos e bolhas), no modelo do Active Theory e do igloo.inc.

## Acessibilidade: WCAG 2.2 AA

- Contraste medido, nunca presumido (texto, controles e foco), inclusive por cima de efeitos e vídeos.
- Foco visível, navegação completa por teclado, HTML semântico, ordem lógica de leitura.
- Estado nunca comunicado só por cor; `alt` útil em imagens informativas e `alt=""` nas decorativas.
- Sem rolagem horizontal em telas pequenas.
- Nada pisca mais de 3 vezes por segundo (SC 2.3.1).

## Movimento

- Animações e vídeos rodam também com `prefers-reduced-motion: reduce`, sem botões de pausa. Esta regra substitui as recomendações de movimento do documento de identidade (§9, §10 e o trecho `prefers-reduced-motion` da §11).
- **Conflito em aberto:** o SC 2.2.2 (Pausar, Parar, Ocultar) exige um mecanismo de pausa para movimento que começa sozinho, dura mais de 5 s e aparece junto com outro conteúdo. Até a decisão pendente em `docs/decisoes.md` ser resolvida, não implementar movimento automático com mais de 5 s.
  - **Exceção (D-020), decisão do dono da marca:** na descida entre a entrada e o Sobre, o vídeo de fundo roda em loop e os nós e as luzes se movem sozinhos enquanto a descida está na tela; fora dela, tudo para. É exceção declarada ao SC 2.2.2. Texto só aparece nos cortes de entrada e de saída da descida, que seguem a rolagem. Vale só para a descida.
  - **Exceção (D-052), decisão do dono da marca:** a névoa da passagem do portfólio para o mostruário deriva sozinha enquanto está na tela; fora dela, para. Exceção declarada ao SC 2.2.2, só para essa névoa.
  - **Exceção (D-053), decisão do dono da marca:** no mostruário, o holograma do símbolo gira no próprio eixo e seus pontos derivam sozinhos enquanto o canvas está na tela; fora dela, para. Exceção declarada ao SC 2.2.2, só para esse holograma.

## Decisões

Toda decisão nova (stack, arquitetura, desvios de recomendação, resolução de conflitos) vai para `docs/decisoes.md`, no formato definido lá, antes ou junto da implementação.
