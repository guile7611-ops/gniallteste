# Portfólio com o holograma do símbolo (D-026), guardado

Versão do portfólio com a base de LED no centro e o símbolo oficial em holograma de pontos
(D-026). Saiu do site em 2026-11-09 (D-027), a pedido do dono da marca, para voltar à espiral de
cards (D-024, D-025) e trabalhar nela. Fica guardada aqui, inteira, para voltar quando quiser.

Esta pasta fica fora do site: não entra no build nem na checagem de tipos (`tsconfig.json`,
`exclude`). Os imports dos arquivos (`../entry/...`, `./helix`) são os da pasta original.

## O que tem aqui

Cópia exata dos arquivos de `components/portfolio/` nessa versão:

- `PortfolioCanvas.tsx`: cena (base de LED, holograma de pontos, cards em órbita, fundo).
- `shaders.ts`: shaders da cena.
- `helix.ts`: órbita, câmera e enquadramento (o da D-026).
- `PortfolioSection.tsx` e `PortfolioSection.module.css`: seção, lista de projetos e véus.
- `projects.ts`: dados dos projetos (igual ao do site hoje).

## Como voltar com ela

1. Copiar os 6 arquivos desta pasta por cima dos de `components/portfolio/`.
2. Registrar a volta em `docs/decisoes.md` (D-026 volta a vigorar) e no `CLAUDE.md`.
3. Rodar `pnpm typecheck` e `pnpm build`.

Antes de copiar, guardar a versão do site em outra pasta como esta, se ela tiver mudado.
