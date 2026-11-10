/**
 * Projetos do portfólio (D-024). Os nomes vieram do cliente; o resto ainda não foi informado e fica
 * como pendência explícita (`null` → "Pendente"), nunca preenchido com dado inventado
 * (CLAUDE.md › Conteúdo).
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
}

export const PROJECTS: readonly Project[] = [
  { slug: 'carby', name: 'Carby', client: null, year: null, kind: null, summary: null, image: null },
  { slug: 'devity', name: 'Devity', client: null, year: null, kind: null, summary: null, image: null },
];

/** Campos mostrados no painel do projeto da vez, na ordem. */
export const FIELDS = [
  { key: 'client', label: 'Cliente' },
  { key: 'year', label: 'Ano' },
  { key: 'kind', label: 'Tipo' },
] as const;

export const anchorId = (p: Project) => `projeto-${p.slug}`;

/** Texto para leitores de tela: o que ainda falta de cada projeto. */
export function pendingNote(p: Project) {
  const missing = [
    p.client === null && 'cliente',
    p.year === null && 'ano',
    p.kind === null && 'tipo',
    p.summary === null && 'resumo',
  ].filter(Boolean) as string[];
  if (missing.length === 0) return '';
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} e ${missing.at(-1)}`;
  const cap = list.charAt(0).toUpperCase() + list.slice(1);
  return `${cap}: ${missing.length === 1 ? 'pendente' : 'pendentes'}.`;
}
