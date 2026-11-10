/**
 * Projetos do portfólio (D-024). Os nomes vieram do cliente; o resto ainda não foi informado e fica
 * `null`, nunca preenchido com dado inventado (CLAUDE.md › Conteúdo). Campo `null` não aparece no
 * site (D-028); as pendências ficam registradas em `docs/decisoes.md`.
 */
export interface Project {
  /** Âncora da rolagem (`#projeto-<slug>`). */
  slug: string;
  name: string;
  /** Cliente (e se pode aparecer). */
  client: string | null;
  year: string | null;
  /** Tipo de projeto. */
  kind: string | null;
  /** Uma frase sobre o projeto. */
  summary: string | null;
  /** Imagem do card (opcional). O vídeo do card da vez espera a autorização do cliente (SC 2.2.2). */
  image: string | null;
  /** Linha pequena acima do título no card (D-043). */
  tag: string | null;
  /** Vídeo do card, sem som, em loop (D-043): fontes em ordem de preferência. */
  video: readonly string[] | null;
  /** Texto curto ao lado do vídeo no projeto aberto (D-049). */
  about: string | null;
  /** Página do projeto ("Acessar projeto", no projeto aberto). */
  link: string | null;
}

export const PROJECTS: readonly Project[] = [
  { slug: 'carby', name: 'Carby', client: null, year: null, kind: null, summary: null, image: null, tag: 'Atendimento', video: ['/media/portfolio/carby.webm', '/media/portfolio/carby.mp4'],
    // Descrição publicada pelo próprio cliente na página do Carby (landing page da Carbotech).
    about: 'Plataforma omnichannel com IA para o WhatsApp oficial. Atendimento inteligente 24/7, vários operadores no mesmo número oficial e integração com o seu sistema ou ERP.',
    link: 'https://gniall.com.br/carby' },
  { slug: 'devity', name: 'Devity', client: null, year: null, kind: null, summary: null, image: null, tag: null, video: null, about: null, link: null },
];

/** Campos do painel do projeto da vez, na ordem. */
const FIELDS = [
  { key: 'client', label: 'Cliente' },
  { key: 'year', label: 'Ano' },
  { key: 'kind', label: 'Tipo' },
] as const;

export const anchorId = (p: Project) => `projeto-${p.slug}`;

/** Dados já informados do projeto (os `null` ficam de fora). */
export function knownFacts(p: Project) {
  return FIELDS.flatMap((f) => {
    const value = p[f.key];
    return value === null ? [] : [{ label: f.label, value }];
  });
}

/**
 * Texto para leitores de tela no índice: os dados já informados e o resumo (o painel visual é
 * `aria-hidden`, porque troca com a rolagem). Vazio enquanto não houver dado.
 */
export function factsNote(p: Project) {
  const parts = knownFacts(p).map((f) => `${f.label}: ${f.value}.`);
  if (p.summary !== null) parts.push(p.summary);
  return parts.join(' ');
}
