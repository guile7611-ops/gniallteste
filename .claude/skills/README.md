# Skills de apoio (terceiros)

Instaladas em 2026-11-05 (D-010). Cópias sem alteração, fixadas no commit abaixo. Só Markdown: nenhum script, nenhum `allowed-tools` ou hook no frontmatter.

**Precedência:** estas skills cedem ao `CLAUDE.md` e às decisões vigentes em `docs/decisoes.md`. Conflitos conhecidos estão listados no fim.

| Pasta | Origem | Commit | Licença |
|---|---|---|---|
| `r3f-fundamentals`, `r3f-animation`, `r3f-shaders`, `r3f-postprocessing` | [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | `4a11805f097396fb0b893172efd1e359e8051f92` (2026-08-31) | MIT, declarada no README (`_licencas/r3f-skills.README.md`); o repositório não tem arquivo LICENSE |
| `gsap-core`, `gsap-timeline`, `gsap-performance`, `gsap-react`, `gsap-scrolltrigger` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) (oficial) | `aed9cfd3277740755f6bfc1155c7aa645403b760` (2026-04-21) | MIT (`_licencas/gsap-skills.LICENSE`) |
| `threejs-shaders`, `threejs-postprocessing` | [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills) | `0e181866f095b5f06d005133876e926515390d95` (2026-10-19) | MIT (`_licencas/threejs-skills.LICENSE`) |

Ficaram de fora destes repositórios as skills fora do escopo atual (física, loaders, iluminação, texturas, geometria, plugins, frameworks, utils). Para acrescentar, baixar do mesmo commit.

## Conflitos conhecidos com as regras do projeto

- **`gsap-core` › `gsap.matchMedia()`**: sugere `duration: 0` com `prefers-reduced-motion: reduce`. No projeto vale a D-003: a animação roda também com movimento reduzido, sem botão de pausa, com no máximo 5 s de movimento automático enquanto a D-004 estiver pendente.
- **`gsap-react`**: recomenda `@gsap/react` (`useGSAP`). O pacote não está instalado. A linha do tempo da tela de entrada é dirigida pelo `useFrame` do R3F (`components/entry/EntryCanvas.tsx`); adotar `@gsap/react` é decisão de stack (D-005).
- **Versões**: os exemplos foram escritos para Fiber 9.7, Drei 10.7.8, three r185/r186 e `@react-three/postprocessing` 3.1. O projeto usa as versões do `package.json`; não atualizar pacotes por causa de uma skill.
