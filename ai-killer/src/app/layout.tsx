import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI杀 — 人与AI同台，互相伪装',
  description: '人与AI同台，互相伪装，互相识破的社交推理游戏',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI杀',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="cyber-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
