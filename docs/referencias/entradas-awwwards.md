# Referência: entradas e loaders (Awwwards e MotionSites)

- **Analisado em:** 2026-11-05, no navegador do Claude. Os vídeos das páginas de elemento do Awwwards foram pausados em vários tempos para ver os quadros-chave.
- **Objetivo:** achar padrões para uma entrada mais "triunfal" e com mais WebGL.
- **Legenda:** **visto** é o que aparece nos quadros; **hipótese** é interpretação minha, não confirmada.

## O que foi visto

| Referência | Duração do vídeo | Visto | Hipótese |
|---|---|---|---|
| [Daoism Systems, preloader](https://www.awwwards.com/inspiration/preloader-daoism-systems) | 9,4 s | (1) Campo escuro de caracteres com uma linha "loading" no centro. (2) Linhas finas de um círculo e cruzes de HUD. (3) Quase preto. (4) O logo aparece formado por dezenas de módulos 3D (barras empilhadas) em contorno/pontos, com franja de cor. Em quadros seguidos os módulos estão em arranjos diferentes (anel, letras). (5) Os módulos param num anel atrás de um título enorme, com textos de HUD nos cantos. | Os módulos se reorganizam continuamente (é uma transformação, não cortes). |
| [Over+Above, brand intro](https://www.awwwards.com/inspiration/brand-intro-over-above) | 6,4 s | Monograma "OA" no centro sobre preto; as duas letras se afastam; o nome completo surge grande, com a interface nas bordas; a página recua e vira o hero. | É feito em DOM/CSS, não em WebGL. |
| [Nexus, logo WebGL transition](https://www.awwwards.com/inspiration/logo-webgl-transition-with-side-scrolling-visuals-nexus) | 7,4 s | Esfera verde grande que se transforma em painéis de interface com um cartão de vidro. | — |
| [Sofia Shcherbak, loading](https://www.awwwards.com/inspiration/sofia-sherbak-loading-sofia-scherbak) | 11,8 s | Fotos surgem uma a uma sobre uma grade com diagonais, em fundo claro, com contador no topo. | — |
| [MotionSites](https://motionsites.ai) | — | Galeria paga de prompts de sites gerados por IA e vídeos de fundo (renders 3D de produto, personagens). | Pouco útil para a Gniall; a única ideia aproveitável é o hero com vídeo cinematográfico pré-renderizado. |

igloo.inc e Active Theory já estão em `igloo-inc.md` e `activetheory.md`.

## Padrões que se repetem

1. **Escuro → um evento forte → a marca.** Daoism, Over+Above e o loader do Active Theory começam quase vazios e guardam o brilho para um único momento.
2. **Logo formado por muitos módulos.** Daoism (barras) e igloo (blocos que caem e encaixam).
3. **Camada de HUD técnico.** Linhas finas, cruzes, círculos e textos de canto (Daoism, igloo, Active Theory).
4. **A entrada entrega para a página.** Over+Above recua até virar o hero; Daoism termina no título.

## Tradução para a Gniall

| Padrão | Na Gniall | Origem no conceito |
|---|---|---|
| Logo feito de módulos | Nós (quadradinhos) da matriz 45° convergem e formam as peças do símbolo | Nós + matriz |
| Evento forte único | O "commit": os nós encaixam, uma onda de choque percorre a grade | Nó |
| HUD técnico | Linhas de medição e coordenadas da grade entre as peças em movimento (sem números inventados) | Matriz + tag |
| Entrega para a página | O logo assenta, a grade recua e vira o fundo da tela "sobre" | Matriz |

## O que não levar

- Franja de cor RGB (Daoism): introduz cores fora da paleta.
- Fotos de banco de imagens e vídeos genéricos (MotionSites).
- Contador de porcentagem falso: só se medir o carregamento de verdade.
