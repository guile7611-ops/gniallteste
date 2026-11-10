# Referência: igloo.inc

- **URL:** https://www.igloo.inc
- **Analisado em:** 2026-11-05, no navegador do Claude (desktop ~800 px de largura, com `prefers-reduced-motion: reduce` ativo).
- **Capturas:** `igloo-inc/` (numeradas na ordem da experiência).
- **O que é:** site da Igloo Inc., holding de marcas de consumo ligadas a cripto (Pudgy Penguins etc.).

## A ideia central

Uma única metáfora sustenta o site inteiro: o nome vira objeto, o objeto define o material, e o material define cada efeito. **Igloo → iglu → blocos de gelo → empresas do portfólio congeladas em cristais.** Nenhum efeito está ali por estar; todos saem do gelo e do bloco.

Esta é a lição principal para a Gniall, e é exatamente o que o `CLAUDE.md` já exige: os efeitos nascem da matriz 45°, do símbolo de tag e dos nós.

## Sequência da experiência

| # | Momento | O que acontece | Captura |
|---|---|---|---|
| 0 | Carregamento | Barra de progresso feita de caracteres ASCII (`=`, `-`, `+`) que se embaralham. | `00` |
| 1 | Hero | Iglu 3D numa paisagem de neve. Os blocos caem e se encaixam um a um. Durante a montagem, linhas de medição com números ligam os blocos, como um HUD técnico. | `01`, `02` |
| 2 | Texto do hero | Monoespaçada nos cantos: logo, copyright, manifesto curto, "scroll down", controle de som. O texto entra "decodificando" (letras aleatórias que se resolvem). | `01` |
| 3 | Rolagem | O iglu se desmonta (os blocos de cima sobem) e a câmera avança. | `03` |
| 4 | Transição | Glitch, separação de cor RGB (franjas coloridas), neblina e texto embaralhando. | `04` |
| 5 | Portfólio | Cada empresa é um cristal de gelo girando, com o logo ou mascote congelado dentro. Rótulos de HUD com linhas-guia: código (`PORTFOLIO_CO_01`), nome, uma "temperatura" com números que variam, data e "click to explore". | `05`, `06` |
| 6 | Transição | Anéis de blocos quebrados se fundem numa esfera de gelo luminosa e viram ondulações concêntricas. | `07`–`09` |
| 7 | Fechamento | Mascote como nuvem de partículas sobre um pódio circular; carrossel de links sociais com seletor entre colchetes e setas. | `10` |
| 8 | Loop | No fim da rolagem, a experiência volta ao iglu (rolagem infinita). | — |
| — | Detalhe | Clicar no cristal abre um painel escuro com rota própria (`/portfolio/<slug>`): texto em monoespaçada, seções com prefixo `//////`, links entre colchetes com seta, botão "Close" com cantos em colchete. As letras embaralham sob o cursor. | `11`, `12` |

## Linguagem visual

- **Paleta quase monocromática:** cinza-azulado frio e branco. A "cor" vem da luz, do brilho e da refração do gelo, não de elementos de interface coloridos.
- **Tipografia:** IBM Plex Mono em todo o site.
- **Interface mínima, presa aos cantos:** o centro é sempre do objeto 3D.
- **Vocabulário de HUD técnico:** linhas finas, cruzes `+`, cantos em colchete, prefixos `//` e `///`, códigos em caixa alta com underscore, números "de instrumento".
- **Ritmo:** cada cena tem um único objeto protagonista; as transições são o momento "absurdo" (glitch, fusão, partículas).

## Técnica observada

- **Motor:** three.js r165 + GSAP 3.12.5; build com Vite (assets com hash), rotas no cliente.
- **Assets:** geometria comprimida com Draco (`.drc`, 20 arquivos), texturas KTX2/Basis (45 arquivos), decodificadores WASM, 18 arquivos de áudio OGG.
- **Texto e ícones dentro do WebGL:** a fonte é um atlas MSDF da IBM Plex Mono em textura; som, fechar, seta e o próprio logo também são texturas.
- **DOM praticamente vazio:** 27 elementos, `body` sem texto, nenhum link, botão, título ou elemento focável, nem na página de detalhe.
- **Rolagem virtual:** `body` com `overflow: hidden`; roda do mouse, toque e setas do teclado avançam uma linha do tempo. Não existe rolagem nativa.

## Comportamento medido (acessibilidade, movimento, som)

- **Movimento reduzido:** com `prefers-reduced-motion: reduce` ativo, o site rodou tudo (montagem, glitch, partículas, rotação). A preferência é ignorada e não há controle de pausa; o único controle é o do som.
- **Movimento automático contínuo:** além do que a rolagem move, há movimento que roda sozinho e não para (cristais girando, partículas, neblina, números do HUD mudando).
- **Som:** ligou sozinho na primeira tecla pressionada (Tab), sem clique no controle de som.
- **Teclado:** Tab não leva a lugar nenhum; setas e espaço só avançam a rolagem. Links e "click to explore" são inalcançáveis sem mouse.
- **Leitor de tela:** não há nada para ler. Todo o conteúdo existe só como pixels.
- **Legibilidade:** o texto que embaralha sob o cursor fica ilegível enquanto o cursor passa. Texto branco fino sobre neblina clara parece ter contraste baixo em vários momentos (não medi).
- **Mobile:** na emulação 375×812 do meu navegador a cena não carregou (erro de pilha no motor 3D, o mesmo de quando o painel estava oculto). Não dá para concluir nada sobre celulares reais; vale testar num aparelho.

## O que levar para a Gniall

| No igloo.inc | Tradução para a Gniall | Origem no conceito |
|---|---|---|
| Iglu montado bloco a bloco | Módulos se encaixando na **matriz 45°** até formar o sistema | Matriz |
| Linhas de medição e HUD | Grade, coordenadas, delimitadores `<` `>`, `//`, hashes de commit | Tag, código |
| Cada bloco que encaixa | Um **nó** ciano acende quando a peça "faz commit" | Nó |
| Portfólio congelado no cristal | Sistemas ou cases **delimitados pelos colchetes da tag**: o território do cliente | Tag |
| Fechamento com o objeto principal | A tag se fecha em torno do sistema: a **entrega ao repositório do cliente** (zero lock-in) | Tag + nó |
| Loader em ASCII | Loader feito da matriz ou de nós se acendendo | Matriz, nó |
| Texto que "decodifica" | Títulos que se resolvem como código, uma vez, na entrada | Código |
| Paleta monocromática; cor vem da luz | Azul Noturno domina; o ciano aparece como **a luz dos nós** (os 5–10% de acento) | Paleta oficial |

## O que não levar (conflita com o `CLAUDE.md`)

- **Texto só no WebGL.** Quebra o WCAG AA (texto alternativo, estrutura, teclado, foco, nomes acessíveis). Na Gniall, todo texto, link e controle é HTML real; o WebGL é camada visual.
- **Logo como textura dentro da cena 3D.** Na Gniall, o logo é o arquivo oficial em HTML, fora de qualquer efeito.
- **Números de instrumento inventados** (a "temperatura" que varia). Na Gniall seriam lidos como métricas falsas. Números de HUD só como coordenadas da grade, índices ou dados reais.
- **Separação RGB com franjas coloridas.** Introduz cores fora da paleta. Se houver glitch, só em azul e ciano.
- **Rolagem virtual que substitui a nativa.** Prejudica teclado, leitor de tela e busca na página. Preferir rolagem nativa conduzindo a linha do tempo.
- **Som ligando na primeira interação.** Na Gniall, som desligado até a pessoa ligar de propósito.
- **Conteúdo bloqueado até o 3D carregar.** Na Gniall, o conteúdo em HTML aparece primeiro e o 3D chega depois.

## Pontos para as decisões em aberto

- **D-003 / D-004 (movimento):** o igloo.inc faz o que a D-003 descreve: ignora o movimento reduzido e não tem pausa. Mas ele mistura dois tipos de movimento. O que a rolagem conduz atende ao SC 2.2.2 sem botão; o que roda sozinho sem parar (cristais, partículas, neblina) não atende. É um bom exemplo para decidir a D-004.
- **D-005 (stack):** chegar nesse nível pede motor WebGL, linha do tempo de animação, pipeline de compressão de assets 3D e, principalmente, **produção de modelos 3D**. O custo está mais nos assets e na direção de arte do que no código.
- **Nova questão: IBM Plex Mono.** Ela é parte da família IBM Plex, mas o manual especifica IBM Plex Sans. Usar a Mono para o vocabulário de HUD/código seria um desvio do manual e precisa de decisão explícita.
