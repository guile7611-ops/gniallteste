import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  display: 'swap',
  variable: '--font-plex',
});


export const metadata: Metadata = {
  title: 'Gniall',
  description:
    'Engenharia de software de missão crítica e Inteligência Artificial aplicada. Zero lock-in: 100% do código-fonte entregue no repositório do cliente.',
  icons: { icon: '/brand/oficial/favicon-light.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0C1E36',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={plex.variable} suppressHydrationWarning>
      <head>
        {/* Marca o documento como "com JS" antes da pintura, para a intro não piscar o logo. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
